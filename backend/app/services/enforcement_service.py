"""Servicio de gestión de Lista Negra (Email Blacklist) y Sanciones Disciplinarias (Strikes / Bans / Suspensiones / Advertencias)."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
import math
from typing import Any, Optional

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload

from app.core.exceptions import BusinessLogicError, ForbiddenError
from app.models.entities import (
    AthleteProfile,
    DisciplinarySanction,
    EmailBlacklist,
    User,
    UserRole,
)
from app.services.email_service import (
    send_account_blacklisted_sync,
    send_account_reactivated_sync,
    send_account_suspended_sync,
    send_appeal_approved_sync,
    send_strike_appeal_approved_sync,
    send_warning_sync,
)
from app.services import user_roles_service as user_roles

BLACKLIST_BLOCK_MESSAGE = (
    "Este correo electrónico se encuentra en la lista negra y tiene el acceso restringido a la plataforma."
)


def normalize_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    cleaned = email.lower().strip()
    return cleaned or None


async def is_email_blacklisted(session: AsyncSession, email: Optional[str]) -> bool:
    normalized = normalize_email(email)
    if not normalized:
        return False
    res = await session.execute(
        select(EmailBlacklist.id).where(EmailBlacklist.email == normalized).limit(1)
    )
    return res.scalar_one_or_none() is not None


async def is_user_banned(
    session: AsyncSession,
    user_id: int,
    email: Optional[str] = None,
) -> bool:
    """Verifica si el usuario se encuentra vetado permanentemente (en lista negra o sanción de ban activa)."""
    if email and await is_email_blacklisted(session, email):
        return True
    res = await session.execute(
        select(DisciplinarySanction.id)
        .where(
            DisciplinarySanction.user_id == user_id,
            DisciplinarySanction.action_type == "ban",
            DisciplinarySanction.is_active.is_(True),
        )
        .limit(1)
    )
    if res.scalar_one_or_none() is not None:
        return True
    if not email:
        user_res = await session.execute(select(User.email).where(User.id == user_id))
        user_email = user_res.scalar_one_or_none()
        if user_email and await is_email_blacklisted(session, user_email):
            return True
    return False


async def is_user_suspended(
    session: AsyncSession,
    user_id: int,
) -> bool:
    """Verifica si el usuario tiene una sanción activa de suspensión temporal vigente."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    res = await session.execute(
        select(DisciplinarySanction.id).where(
            DisciplinarySanction.user_id == user_id,
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
            or_(
                DisciplinarySanction.expires_at.is_(None),
                DisciplinarySanction.expires_at > now,
            ),
        ).limit(1)
    )
    return res.scalar_one_or_none() is not None


async def assert_user_not_suspended_or_banned(
    session: AsyncSession,
    email: Optional[str] = None,
    user_id: Optional[int] = None,
) -> None:
    """Verifica si el usuario se encuentra vetado o suspendido temporalmente.
    Si una suspensión temporal ya alcanzó su fecha de expiración, se reactiva automáticamente (auto-expire).
    """
    normalized = normalize_email(email)
    if normalized and await is_email_blacklisted(session, normalized):
        raise ForbiddenError(
            BLACKLIST_BLOCK_MESSAGE,
            details={"reason_code": "ACCOUNT_BANNED"},
        )

    user = None
    if user_id:
        user_res = await session.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
    elif normalized:
        user_res = await session.execute(select(User).where(User.email == normalized))
        user = user_res.scalar_one_or_none()

    if not user:
        return

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    sanctions_res = await session.execute(
        select(DisciplinarySanction)
        .where(
            DisciplinarySanction.user_id == user.id,
            DisciplinarySanction.is_active.is_(True),
        )
        .order_by(DisciplinarySanction.created_at.desc())
    )
    active_sanctions = list(sanctions_res.scalars().all())
    if not active_sanctions:
        return

    for s in active_sanctions:
        if s.action_type == "ban":
            raise ForbiddenError(
                BLACKLIST_BLOCK_MESSAGE,
                details={"reason_code": "ACCOUNT_BANNED"},
            )

        if s.action_type == "suspension":
            if s.expires_at and s.expires_at <= now:
                # Suspensión expirada: auto-reactivar en caliente
                s.is_active = False
                active_status_id = await user_roles._active_status_id(session)
                await session.execute(
                    update(UserRole)
                    .where(UserRole.user_id == user.id)
                    .values(status_id=active_status_id)
                )
                await session.flush()
                continue
            else:
                if s.expires_at:
                    exp_str = s.expires_at.strftime("%d/%m/%Y a las %H:%M UTC")
                    raise ForbiddenError(
                        f"Tu cuenta se encuentra suspendida temporalmente hasta el {exp_str}.",
                        details={
                            "reason_code": "ACCOUNT_SUSPENDED",
                            "expires_at": s.expires_at.isoformat(),
                        },
                    )
                else:
                    raise ForbiddenError(
                        "Tu cuenta se encuentra suspendida temporalmente hasta nuevo aviso.",
                        details={
                            "reason_code": "ACCOUNT_SUSPENDED",
                            "expires_at": None,
                        },
                    )


async def assert_email_not_blacklisted(session: AsyncSession, email: Optional[str]) -> None:
    await assert_user_not_suspended_or_banned(session, email=email)



async def get_blacklist_records(
    session: AsyncSession,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[EmailBlacklist], int]:
    query = select(EmailBlacklist)
    count_query = select(func.count(EmailBlacklist.id))

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        condition = or_(
            EmailBlacklist.email.ilike(term),
            EmailBlacklist.reason.ilike(term),
        )
        query = query.where(condition)
        count_query = count_query.where(condition)

    total_res = await session.execute(count_query)
    total = int(total_res.scalar_one() or 0)

    offset = max(0, (page - 1) * limit)
    query = query.order_by(EmailBlacklist.created_at.desc()).offset(offset).limit(limit)

    res = await session.execute(query)
    items = list(res.scalars().all())
    return items, total


async def add_email_to_blacklist(
    session: AsyncSession,
    email: str,
    reason: Optional[str] = None,
    user_id: Optional[int] = None,
    created_by: Optional[int] = None,
    notify_user: bool = True,
) -> EmailBlacklist:
    normalized = normalize_email(email)
    if not normalized:
        raise BusinessLogicError("Dirección de correo electrónico requerida.")

    res = await session.execute(
        select(EmailBlacklist).where(EmailBlacklist.email == normalized)
    )
    existing = res.scalar_one_or_none()

    if existing:
        if reason:
            existing.reason = reason[:255]
        if user_id is not None:
            existing.user_id = user_id
        if created_by is not None:
            existing.created_by = created_by
        await session.flush()
        item = existing
    else:
        item = EmailBlacklist(
            email=normalized,
            reason=(reason or "")[:255] or None,
            user_id=user_id,
            created_by=created_by,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        session.add(item)
        await session.flush()

    if notify_user and normalized:
        user_name = None
        if user_id:
            u_res = await session.execute(select(User.full_name).where(User.id == user_id))
            user_name = u_res.scalar_one_or_none()
        if not user_name:
            u_res = await session.execute(select(User.full_name).where(User.email == normalized))
            user_name = u_res.scalar_one_or_none()

        try:
            asyncio.create_task(
                asyncio.to_thread(
                    send_account_blacklisted_sync,
                    to_email=normalized,
                    reason=reason,
                    user_name=user_name,
                )
            )
        except Exception as e:
            print(f"[Blacklist notification dispatch warning]: {e}")

    return item


async def update_blacklist_record(
    session: AsyncSession,
    record_id: int,
    reason: Optional[str] = None,
) -> Optional[EmailBlacklist]:
    res = await session.execute(
        select(EmailBlacklist).where(EmailBlacklist.id == record_id)
    )
    item = res.scalar_one_or_none()
    if not item:
        return None

    item.reason = (reason or "")[:255] or None
    await session.flush()
    return item


async def remove_email_from_blacklist(
    session: AsyncSession,
    record_id: Optional[int] = None,
    email: Optional[str] = None,
) -> bool:
    if record_id is not None:
        res = await session.execute(
            select(EmailBlacklist).where(EmailBlacklist.id == record_id)
        )
    elif email:
        normalized = normalize_email(email)
        res = await session.execute(
            select(EmailBlacklist).where(EmailBlacklist.email == normalized)
        )
    else:
        return False

    item = res.scalar_one_or_none()
    if not item:
        return False

    # Si hay un usuario asociado (directamente o por email), desmarcar sanciones de baneo y reactivar roles
    user_id = item.user_id
    if not user_id and item.email:
        u_res = await session.execute(select(User.id).where(User.email == item.email))
        user_id = u_res.scalar_one_or_none()

    if user_id:
        await session.execute(
            update(DisciplinarySanction)
            .where(
                DisciplinarySanction.user_id == user_id,
                DisciplinarySanction.action_type == "ban",
            )
            .values(is_active=False)
        )
        active_status_id = await user_roles._active_status_id(session)
        await session.execute(
            update(UserRole)
            .where(UserRole.user_id == user_id)
            .values(status_id=active_status_id)
        )

    await session.delete(item)
    await session.flush()
    return True


async def get_user_sanctions(
    session: AsyncSession,
    user_id: int,
) -> list[DisciplinarySanction]:
    res = await session.execute(
        select(DisciplinarySanction)
        .where(DisciplinarySanction.user_id == user_id)
        .order_by(DisciplinarySanction.created_at.desc())
    )
    return list(res.scalars().all())


async def get_user_sanction_summary(
    session: AsyncSession,
    user_id: int,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Auto-expirar en caliente suspensiones vencidas del usuario
    expired_susp = await session.execute(
        select(DisciplinarySanction.id)
        .where(
            DisciplinarySanction.user_id == user_id,
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
            DisciplinarySanction.expires_at.is_not(None),
            DisciplinarySanction.expires_at <= now,
        )
    )
    expired_ids = expired_susp.scalars().all()
    if expired_ids:
        await session.execute(
            update(DisciplinarySanction)
            .where(DisciplinarySanction.id.in_(expired_ids))
            .values(is_active=False)
        )
        active_status_id = await user_roles._active_status_id(session)
        await session.execute(
            update(UserRole)
            .where(UserRole.user_id == user_id)
            .values(status_id=active_status_id)
        )
        await session.flush()

    sanctions = await get_user_sanctions(session, user_id)

    active_strikes = [
        s for s in sanctions
        if s.action_type == "strike"
        and s.is_active
        and (s.expires_at is None or s.expires_at > now)
    ]
    total_strike_points = sum(s.points for s in active_strikes)
    is_banned = any(s.action_type == "ban" and s.is_active for s in sanctions)

    # Check blacklist
    user_res = await session.execute(select(User.email).where(User.id == user_id))
    user_email = user_res.scalar_one_or_none()
    is_blacklisted = await is_email_blacklisted(session, user_email) if user_email else False

    # Check active suspension
    active_suspension_obj = next(
        (
            s for s in sanctions
            if s.action_type == "suspension"
            and s.is_active
            and (s.expires_at is None or s.expires_at > now)
        ),
        None,
    )
    active_suspension = None
    if active_suspension_obj:
        days_rem = 0
        dur_days = None
        if active_suspension_obj.expires_at and active_suspension_obj.created_at:
            dur_days = max(1, round((active_suspension_obj.expires_at - active_suspension_obj.created_at).total_seconds() / 86400))
        if active_suspension_obj.expires_at:
            delta = active_suspension_obj.expires_at - now
            days_rem = max(0, int(math.ceil(delta.total_seconds() / 86400)))
            if dur_days is not None and days_rem > dur_days:
                days_rem = dur_days
        active_suspension = {
            "id": active_suspension_obj.id,
            "reason": active_suspension_obj.reason,
            "category": active_suspension_obj.category,
            "duration_days": dur_days,
            "days_remaining": days_rem,
            "starts_at": active_suspension_obj.created_at.isoformat() if active_suspension_obj.created_at else None,
            "expires_at": active_suspension_obj.expires_at.isoformat() if active_suspension_obj.expires_at else None,
        }

    return {
        "user_id": user_id,
        "email": user_email,
        "active_strikes_count": len(active_strikes),
        "total_strike_points": total_strike_points,
        "is_banned": is_banned or is_blacklisted,
        "is_blacklisted": is_blacklisted,
        "is_suspended": active_suspension is not None,
        "active_suspension": active_suspension,
        "sanctions_count": len(sanctions),
    }


async def ban_user(
    session: AsyncSession,
    user_id: int,
    reason: str,
    created_by: Optional[int] = None,
) -> dict[str, Any]:
    # 1. Fetch user email
    user_res = await session.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise BusinessLogicError(f"Usuario {user_id} no encontrado.")

    if await is_user_banned(session, user_id, user.email):
        raise BusinessLogicError("El usuario ya se encuentra vetado permanentemente.")

    # 2. Deactivate roles
    inactive_status_id = await user_roles._inactive_status_id(session)
    await session.execute(
        update(UserRole)
        .where(UserRole.user_id == user_id)
        .values(status_id=inactive_status_id)
    )

    # 3. Revoke athlete verification
    await session.execute(
        update(AthleteProfile)
        .where(AthleteProfile.user_id == user_id)
        .values(is_verified=False)
    )

    # 4. Deactivate any active suspension if escalating
    await session.execute(
        update(DisciplinarySanction)
        .where(
            DisciplinarySanction.user_id == user_id,
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
        )
        .values(is_active=False)
    )

    # 5. Record ban sanction
    ban_sanction = DisciplinarySanction(
        user_id=user_id,
        action_type="ban",
        points=3,
        reason=reason,
        category="conduct",
        created_by=created_by,
        is_active=True,
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    session.add(ban_sanction)

    # 6. Add to email blacklist
    blacklist_entry = await add_email_to_blacklist(
        session=session,
        email=user.email,
        reason=f"Baneado: {reason}",
        user_id=user_id,
        created_by=created_by,
    )

    await session.flush()

    return {
        "user_id": user_id,
        "email": user.email,
        "status": "banned",
        "reason": reason,
        "blacklist_id": blacklist_entry.id,
    }


async def issue_strike(
    session: AsyncSession,
    user_id: int,
    reason: str,
    points: int = 1,
    category: str = "conduct",
    expires_at: Optional[datetime] = None,
    expires_in_days: Optional[int] = None,
    created_by: Optional[int] = None,
) -> dict[str, Any]:
    user_res = await session.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise BusinessLogicError(f"Usuario {user_id} no encontrado.")

    if await is_user_banned(session, user_id, user.email):
        raise BusinessLogicError("El usuario se encuentra vetado permanentemente. No es posible aplicarle strikes.")

    if await is_user_suspended(session, user_id):
        raise BusinessLogicError("El usuario se encuentra suspendido temporalmente. No es posible aplicarle strikes.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    effective_expires_at = expires_at
    if effective_expires_at is None and expires_in_days:
        effective_expires_at = now + timedelta(days=expires_in_days)

    # Add strike
    strike = DisciplinarySanction(
        user_id=user_id,
        action_type="strike",
        points=max(1, points),
        reason=reason,
        category=category,
        expires_at=effective_expires_at,
        created_by=created_by,
        is_active=True,
        created_at=now,
    )
    session.add(strike)
    await session.flush()

    # Calculate active strike points
    sanctions = await get_user_sanctions(session, user_id)
    active_strikes = [
        s for s in sanctions
        if s.action_type == "strike"
        and s.is_active
        and (s.expires_at is None or s.expires_at > now)
    ]
    total_points = sum(s.points for s in active_strikes)

    auto_banned = False
    ban_info = None

    # Threshold: 3 points triggers auto-ban
    if total_points >= 3:
        auto_banned = True
        ban_info = await ban_user(
            session=session,
            user_id=user_id,
            reason=f"Suspensión permanente automática por acumulación de {total_points} strikes ({reason})",
            created_by=created_by,
        )

    return {
        "strike_id": strike.id,
        "user_id": user_id,
        "points_issued": points,
        "total_active_points": total_points,
        "active_strikes_count": len(active_strikes),
        "expires_at": effective_expires_at.isoformat() if effective_expires_at else None,
        "auto_banned": auto_banned,
        "ban_details": ban_info,
    }


async def suspend_user(
    session: AsyncSession,
    user_id: int,
    reason: str,
    duration_days: int = 7,
    category: str = "conduct",
    created_by: Optional[int] = None,
    notify_user: bool = True,
) -> dict[str, Any]:
    """Aplica una suspensión temporal con auto-reactivación al expirar."""
    user_res = await session.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise BusinessLogicError(f"Usuario {user_id} no encontrado.")

    if await is_user_banned(session, user_id, user.email):
        raise BusinessLogicError("El usuario se encuentra vetado permanentemente. No es posible suspenderlo.")

    if await is_user_suspended(session, user_id):
        raise BusinessLogicError("El usuario ya se encuentra suspendido actualmente.")

    # 1. Desactivar roles del usuario
    inactive_status_id = await user_roles._inactive_status_id(session)
    await session.execute(
        update(UserRole)
        .where(UserRole.user_id == user_id)
        .values(status_id=inactive_status_id)
    )

    # 2. Desactivar suspensiones previas activas
    await session.execute(
        update(DisciplinarySanction)
        .where(
            DisciplinarySanction.user_id == user_id,
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
        )
        .values(is_active=False)
    )

    # 3. Registrar nueva sanción con expires_at
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now + timedelta(days=duration_days)

    sanction = DisciplinarySanction(
        user_id=user_id,
        action_type="suspension",
        points=0,
        reason=reason,
        category=category,
        expires_at=expires_at,
        created_by=created_by,
        is_active=True,
        created_at=now,
    )
    session.add(sanction)
    await session.flush()

    # 4. Despachar correo formal de suspensión
    if notify_user and user.email:
        expires_str = expires_at.strftime("%d/%m/%Y a las %H:%M UTC")
        try:
            asyncio.create_task(
                asyncio.to_thread(
                    send_account_suspended_sync,
                    to_email=user.email,
                    user_name=user.full_name,
                    reason=reason,
                    expires_at_str=expires_str,
                    duration_days=duration_days,
                )
            )
        except Exception as e:
            print(f"[Suspension notification dispatch warning]: {e}")

    return {
        "sanction_id": sanction.id,
        "user_id": user_id,
        "email": user.email,
        "action_type": "suspension",
        "duration_days": duration_days,
        "starts_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "reason": reason,
        "category": category,
    }


async def lift_suspension(
    session: AsyncSession,
    user_id: int,
    created_by: Optional[int] = None,
    resolution_note: Optional[str] = None,
    notify_user: bool = True,
) -> dict[str, Any]:
    """Levanta anticipadamente cualquier suspensión temporal y reactiva la cuenta."""
    user_res = await session.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise BusinessLogicError(f"Usuario {user_id} no encontrado.")

    # 1. Desactivar sanciones de tipo suspensión activas
    await session.execute(
        update(DisciplinarySanction)
        .where(
            DisciplinarySanction.user_id == user_id,
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
        )
        .values(is_active=False)
    )

    # 2. Restaurar status a ACTIVE en user_roles
    active_status_id = await user_roles._active_status_id(session)
    await session.execute(
        update(UserRole)
        .where(UserRole.user_id == user_id)
        .values(status_id=active_status_id)
    )
    await session.flush()

    # 3. Enviar correo de reactivación
    if notify_user and user.email:
        try:
            asyncio.create_task(
                asyncio.to_thread(
                    send_account_reactivated_sync,
                    to_email=user.email,
                    user_name=user.full_name,
                    reason=resolution_note or "Suspensión levantada por el equipo de moderación",
                )
            )
        except Exception as e:
            print(f"[Reactivation notification dispatch warning]: {e}")

    return {
        "user_id": user_id,
        "email": user.email,
        "status": "active",
        "message": "Suspensión levantada y cuenta reactivada con éxito.",
    }


async def issue_warning(
    session: AsyncSession,
    user_id: int,
    reason: str,
    category: str = "conduct",
    created_by: Optional[int] = None,
    notify_user: bool = True,
) -> dict[str, Any]:
    """Emite una advertencia preventiva (warning) sin corte de acceso ni puntos."""
    user_res = await session.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise BusinessLogicError(f"Usuario {user_id} no encontrado.")

    if await is_user_banned(session, user_id, user.email):
        raise BusinessLogicError("El usuario se encuentra vetado permanentemente. No es posible emitirle advertencias.")

    if await is_user_suspended(session, user_id):
        raise BusinessLogicError("El usuario se encuentra suspendido temporalmente. No es posible emitirle advertencias.")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    warning = DisciplinarySanction(
        user_id=user_id,
        action_type="warning",
        points=0,
        reason=reason,
        category=category,
        created_by=created_by,
        is_active=False,
        created_at=now,
    )
    session.add(warning)
    await session.flush()

    if notify_user and user.email:
        try:
            asyncio.create_task(
                asyncio.to_thread(
                    send_warning_sync,
                    to_email=user.email,
                    user_name=user.full_name,
                    reason=reason,
                    category=category,
                )
            )
        except Exception as e:
            print(f"[Warning notification dispatch warning]: {e}")

    return {
        "sanction_id": warning.id,
        "user_id": user_id,
        "email": user.email,
        "action_type": "warning",
        "reason": reason,
        "category": category,
    }


async def get_active_suspensions(
    session: AsyncSession,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict[str, Any]], int]:
    """Obtiene las suspensiones temporales activas con auto-expiración de registros vencidos."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Auto-expirar suspensiones vencidas en caliente
    expired_res = await session.execute(
        select(DisciplinarySanction.id, DisciplinarySanction.user_id)
        .where(
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
            DisciplinarySanction.expires_at.is_not(None),
            DisciplinarySanction.expires_at <= now,
        )
    )
    expired_rows = expired_res.all()
    if expired_rows:
        expired_ids = [r[0] for r in expired_rows]
        user_ids_to_reactivate = list(set([r[1] for r in expired_rows]))
        await session.execute(
            update(DisciplinarySanction)
            .where(DisciplinarySanction.id.in_(expired_ids))
            .values(is_active=False)
        )
        active_status_id = await user_roles._active_status_id(session)
        for u_id in user_ids_to_reactivate:
            await session.execute(
                update(UserRole)
                .where(UserRole.user_id == u_id)
                .values(status_id=active_status_id)
            )
        await session.flush()

    # 2. Consultar suspensiones activas
    AdminUser = aliased(User)
    query = (
        select(
            DisciplinarySanction,
            User.email,
            User.full_name,
            User.avatar_url,
            AthleteProfile.handle,
            AdminUser.full_name.label("admin_name"),
        )
        .join(User, DisciplinarySanction.user_id == User.id)
        .outerjoin(AthleteProfile, AthleteProfile.user_id == User.id)
        .outerjoin(AdminUser, DisciplinarySanction.created_by == AdminUser.id)
        .where(
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
        )
    )

    count_query = (
        select(func.count(DisciplinarySanction.id))
        .join(User, DisciplinarySanction.user_id == User.id)
        .outerjoin(AthleteProfile, AthleteProfile.user_id == User.id)
        .where(
            DisciplinarySanction.action_type == "suspension",
            DisciplinarySanction.is_active.is_(True),
        )
    )

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        cond = or_(
            User.email.ilike(term),
            User.full_name.ilike(term),
            AthleteProfile.handle.ilike(term),
            DisciplinarySanction.reason.ilike(term),
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total_res = await session.execute(count_query)
    total = int(total_res.scalar_one() or 0)

    offset = max(0, (page - 1) * limit)
    query = query.order_by(DisciplinarySanction.created_at.desc()).offset(offset).limit(limit)
    res = await session.execute(query)
    rows = res.all()

    items = []
    for s, email, full_name, avatar_url, handle, admin_name in rows:
        days_rem = 0
        dur_days = None
        if s.expires_at and s.created_at:
            dur_days = max(1, round((s.expires_at - s.created_at).total_seconds() / 86400))
        if s.expires_at:
            delta = s.expires_at - now
            days_rem = max(0, int(math.ceil(delta.total_seconds() / 86400)))
            if dur_days is not None and days_rem > dur_days:
                days_rem = dur_days

        items.append({
            "id": s.id,
            "user_id": s.user_id,
            "email": email,
            "full_name": full_name,
            "handle": handle,
            "avatar_url": avatar_url,
            "reason": s.reason,
            "category": s.category or "conduct",
            "duration_days": dur_days,
            "days_remaining": days_rem,
            "starts_at": s.created_at,
            "expires_at": s.expires_at,
            "created_by": s.created_by,
            "created_by_name": admin_name,
        })

    return items, total


async def get_global_sanctions(
    session: AsyncSession,
    action_type: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[dict[str, Any]], int]:
    """Obtiene el historial global de sanciones con filtros completos."""
    AdminUser = aliased(User)
    query = (
        select(
            DisciplinarySanction,
            User.email,
            User.full_name,
            User.avatar_url,
            AthleteProfile.handle,
            AdminUser.full_name.label("admin_name"),
        )
        .join(User, DisciplinarySanction.user_id == User.id)
        .outerjoin(AthleteProfile, AthleteProfile.user_id == User.id)
        .outerjoin(AdminUser, DisciplinarySanction.created_by == AdminUser.id)
    )

    count_query = (
        select(func.count(DisciplinarySanction.id))
        .join(User, DisciplinarySanction.user_id == User.id)
        .outerjoin(AthleteProfile, AthleteProfile.user_id == User.id)
    )

    if action_type and action_type.strip():
        query = query.where(DisciplinarySanction.action_type == action_type.strip().lower())
        count_query = count_query.where(DisciplinarySanction.action_type == action_type.strip().lower())

    if category and category.strip():
        query = query.where(DisciplinarySanction.category == category.strip().lower())
        count_query = count_query.where(DisciplinarySanction.category == category.strip().lower())

    if is_active is not None:
        query = query.where(DisciplinarySanction.is_active == is_active)
        count_query = count_query.where(DisciplinarySanction.is_active == is_active)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        cond = or_(
            User.email.ilike(term),
            User.full_name.ilike(term),
            AthleteProfile.handle.ilike(term),
            DisciplinarySanction.reason.ilike(term),
        )
        query = query.where(cond)
        count_query = count_query.where(cond)

    total_res = await session.execute(count_query)
    total = int(total_res.scalar_one() or 0)

    offset = max(0, (page - 1) * limit)
    query = query.order_by(DisciplinarySanction.created_at.desc()).offset(offset).limit(limit)
    res = await session.execute(query)
    rows = res.all()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    items = []
    for s, email, full_name, avatar_url, handle, admin_name in rows:
        days_rem = 0
        dur_days = None
        exp_dt = s.expires_at.replace(tzinfo=None) if s.expires_at else None
        created_dt = s.created_at.replace(tzinfo=None) if s.created_at else None
        if exp_dt and created_dt:
            dur_days = max(1, round((exp_dt - created_dt).total_seconds() / 86400))
        if exp_dt:
            delta = exp_dt - now
            days_rem = max(0, int(math.ceil(delta.total_seconds() / 86400)))
            if dur_days is not None and days_rem > dur_days:
                days_rem = dur_days

        items.append({
            "id": s.id,
            "user_id": s.user_id,
            "email": email,
            "full_name": full_name,
            "handle": handle,
            "avatar_url": avatar_url,
            "action_type": s.action_type,
            "points": s.points,
            "reason": s.reason,
            "category": s.category or "conduct",
            "duration_days": dur_days,
            "days_remaining": days_rem,
            "is_active": bool(s.is_active),
            "created_at": s.created_at,
            "expires_at": s.expires_at,
            "created_by": s.created_by,
            "created_by_name": admin_name,
        })

    return items, total


async def appeal_ban(
    session: AsyncSession,
    user_id: Optional[int] = None,
    email: Optional[str] = None,
    record_id: Optional[int] = None,
    resolution_reason: Optional[str] = None,
    reset_strikes: bool = True,
    created_by: Optional[int] = None,
    notify_user: bool = True,
) -> dict[str, Any]:
    """Procesa una apelación favorable de veto: remueve de lista negra, rehabilita roles y resetea strikes."""
    user = None
    target_email = None

    if record_id is not None:
        bl_res = await session.execute(
            select(EmailBlacklist).where(EmailBlacklist.id == record_id)
        )
        bl_item = bl_res.scalar_one_or_none()
        if bl_item:
            target_email = bl_item.email
            if bl_item.user_id:
                user_id = bl_item.user_id

    if user_id:
        u_res = await session.execute(select(User).where(User.id == user_id))
        user = u_res.scalar_one_or_none()
        if user:
            target_email = user.email

    if not user and (email or target_email):
        clean_email = normalize_email(email or target_email)
        if clean_email:
            target_email = clean_email
            u_res = await session.execute(select(User).where(User.email == clean_email))
            user = u_res.scalar_one_or_none()

    if not target_email and not user:
        raise BusinessLogicError("No se pudo identificar la cuenta o correo para procesar la apelación.")

    # 1. Remover de email_blacklist
    if target_email:
        clean_email = normalize_email(target_email)
        await remove_email_from_blacklist(session, email=clean_email)

    if record_id is not None:
        await remove_email_from_blacklist(session, record_id=record_id)

    # 2. Si es usuario registrado, actualizar sanciones disciplinarias y restaurar roles
    strikes_cleared = 0
    if user:
        note = resolution_reason or "Apelación aprobada por el equipo de moderación"
        await session.execute(
            update(DisciplinarySanction)
            .where(
                DisciplinarySanction.user_id == user.id,
                DisciplinarySanction.action_type == "ban",
                DisciplinarySanction.is_active.is_(True),
            )
            .values(
                is_active=False,
                reason=func.concat(DisciplinarySanction.reason, f" [APELADO: {note}]"),
            )
        )

        # Si se solicita resetear strikes acumulados
        if reset_strikes:
            strike_res = await session.execute(
                update(DisciplinarySanction)
                .where(
                    DisciplinarySanction.user_id == user.id,
                    DisciplinarySanction.action_type == "strike",
                    DisciplinarySanction.is_active.is_(True),
                )
                .values(is_active=False)
            )
            strikes_cleared = strike_res.rowcount or 0

        # Restaurar estado a ACTIVE en user_roles
        active_status_id = await user_roles._active_status_id(session)
        await session.execute(
            update(UserRole)
            .where(UserRole.user_id == user.id)
            .values(status_id=active_status_id)
        )

    await session.flush()

    # 3. Notificación oficial por correo
    recipient_email = user.email if user else target_email
    user_display_name = user.full_name if user else None
    if notify_user and recipient_email:
        try:
            asyncio.create_task(
                asyncio.to_thread(
                    send_appeal_approved_sync,
                    to_email=recipient_email,
                    user_name=user_display_name,
                    resolution_reason=resolution_reason,
                )
            )
        except Exception as e:
            print(f"[Appeal notification dispatch warning]: {e}")

    return {
        "user_id": user.id if user else None,
        "email": recipient_email,
        "status": "appealed",
        "strikes_cleared": strikes_cleared,
        "resolution_reason": resolution_reason,
        "message": "Apelación aprobada con éxito. Veto revocado y cuenta rehabilitada.",
    }


async def appeal_strike(
    session: AsyncSession,
    sanction_id: int,
    resolution_reason: Optional[str] = None,
    created_by: Optional[int] = None,
    notify_user: bool = True,
) -> dict[str, Any]:
    """Resuelve favorablemente una apelación de un strike: anula la sanción, descuenta los puntos y notifica al usuario."""
    res = await session.execute(
        select(DisciplinarySanction).where(DisciplinarySanction.id == sanction_id)
    )
    sanction = res.scalar_one_or_none()
    if not sanction:
        raise BusinessLogicError(f"Sanción #{sanction_id} no encontrada.")

    if sanction.action_type != "strike":
        raise BusinessLogicError(f"La sanción #{sanction_id} no es un strike (tipo: {sanction.action_type}).")

    if not sanction.is_active:
        raise BusinessLogicError("Este strike ya se encuentra inactivo o previamente apelado.")

    note = resolution_reason or "Apelación de strike aceptada por moderación"
    original_reason = sanction.reason or "Strike disciplinario"
    sanction.is_active = False
    sanction.reason = f"{original_reason} [APELADO: {note}]"
    await session.flush()

    # Obtener datos del usuario
    u_res = await session.execute(select(User).where(User.id == sanction.user_id))
    user = u_res.scalar_one_or_none()

    # Recalcular puntos activos restantes de strike
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    sanctions = await get_user_sanctions(session, sanction.user_id)
    active_strikes = [
        s for s in sanctions
        if s.action_type == "strike"
        and s.is_active
        and (s.expires_at is None or s.expires_at.replace(tzinfo=None) > now)
    ]
    remaining_points = sum(s.points for s in active_strikes)

    # Si el usuario cayó en auto-ban por haber acumulado >= 3 strikes y ahora tiene < 3 strikes,
    # levantar el auto-ban automáticamente.
    auto_ban_lifted = False
    if remaining_points < 3:
        active_bans = [
            s for s in sanctions
            if s.action_type == "ban"
            and s.is_active
            and ("automática" in (s.reason or "").lower() or "auto-ban" in (s.reason or "").lower())
        ]
        if active_bans:
            for ab in active_bans:
                ab.is_active = False
                ab.reason = (ab.reason or "") + f" [REVOCADO TRAS APELACIÓN DE STRIKE #{sanction_id}]"

            # Remover de lista negra
            bl_res = await session.execute(
                select(EmailBlacklist).where(EmailBlacklist.user_id == sanction.user_id)
            )
            for bl_item in bl_res.scalars().all():
                await session.delete(bl_item)

            # Restaurar roles
            active_status_id = await user_roles._active_status_id(session)
            await session.execute(
                update(UserRole)
                .where(UserRole.user_id == sanction.user_id)
                .values(status_id=active_status_id)
            )
            auto_ban_lifted = True

    await session.flush()

    # Notificación oficial por correo
    if notify_user and user and user.email:
        try:
            asyncio.create_task(
                asyncio.to_thread(
                    send_strike_appeal_approved_sync,
                    to_email=user.email,
                    user_name=user.full_name,
                    strike_points=sanction.points,
                    strike_reason=original_reason,
                    resolution_reason=resolution_reason,
                )
            )
        except Exception as e:
            print(f"[Strike appeal notification dispatch warning]: {e}")

    return {
        "sanction_id": sanction.id,
        "user_id": sanction.user_id,
        "points_revoked": sanction.points,
        "remaining_strike_points": remaining_points,
        "auto_ban_lifted": auto_ban_lifted,
        "resolution_reason": resolution_reason,
        "message": f"Strike #{sanction_id} ({sanction.points} pt) anulado con éxito. Puntos descontados.",
    }



