"""Asignación multi-rol vía user_roles + lookup_items (Account Roles)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BusinessLogicError
from app.models.entities import LookupGroup, LookupItem, UserRole

GROUP_ACCOUNT_ROLES = 600
GROUP_ACCOUNT_ROLE_STATUSES = 700

ROLE_SUPPORTER = "supporter"
ROLE_ATHLETE = "athlete"
ROLE_ADMIN = "admin"

CODE_SUPPORTER = 601
CODE_ATHLETE = 602
CODE_ADMIN = 603
CODE_ACTIVE = 701
CODE_INACTIVE = 702

PRODUCT_ROLES = (ROLE_SUPPORTER, ROLE_ATHLETE)
ALLOWED_ROLES = (ROLE_SUPPORTER, ROLE_ATHLETE, ROLE_ADMIN)

_ROLE_CODES = {
    ROLE_SUPPORTER: CODE_SUPPORTER,
    ROLE_ATHLETE: CODE_ATHLETE,
    ROLE_ADMIN: CODE_ADMIN,
}


async def _lookup_item_id(session: AsyncSession, group_code: int, item_code: int) -> int:
    result = await session.execute(
        select(LookupItem.id)
        .join(LookupGroup, LookupItem.lookup_group_id == LookupGroup.id)
        .where(
            LookupGroup.code == group_code,
            LookupItem.code == item_code,
            LookupItem.is_active.is_(True),
        )
        .limit(1)
    )
    item_id = result.scalar_one_or_none()
    if item_id is None:
        raise BusinessLogicError(
            f"Lookup no encontrado (group={group_code}, item={item_code}). "
            "Ejecuta backend/scripts/add_user_roles.sql."
        )
    return int(item_id)


async def _role_item_id(session: AsyncSession, role_name: str) -> int:
    code = _ROLE_CODES.get(str(role_name).strip().lower())
    if code is None:
        raise BusinessLogicError(f"Rol no válido: {role_name}")
    return await _lookup_item_id(session, GROUP_ACCOUNT_ROLES, code)


async def _active_status_id(session: AsyncSession) -> int:
    return await _lookup_item_id(session, GROUP_ACCOUNT_ROLE_STATUSES, CODE_ACTIVE)


async def _inactive_status_id(session: AsyncSession) -> int:
    return await _lookup_item_id(session, GROUP_ACCOUNT_ROLE_STATUSES, CODE_INACTIVE)


async def get_active_role_names(session: AsyncSession, user_id: int) -> list[str]:
    active_id = await _active_status_id(session)
    result = await session.execute(
        select(UserRole)
        .options(selectinload(UserRole.role_item))
        .where(UserRole.user_id == int(user_id), UserRole.status_id == active_id)
    )
    names: list[str] = []
    for row in result.scalars().all():
        if row.role_item and row.role_item.label:
            names.append(str(row.role_item.label).strip().lower())
    return names


async def has_role(session: AsyncSession, user_id: int, role_name: str) -> bool:
    return str(role_name).strip().lower() in await get_active_role_names(session, user_id)


async def is_admin(session: AsyncSession, user_id: int) -> bool:
    return await has_role(session, user_id, ROLE_ADMIN)


async def primary_product_role(session: AsyncSession, user_id: int) -> str:
    names = await get_active_role_names(session, user_id)
    if ROLE_ATHLETE in names:
        return ROLE_ATHLETE
    return ROLE_SUPPORTER


async def ensure_role(
    session: AsyncSession,
    *,
    user_id: int,
    role_name: str,
    created_by: int,
    active: bool = True,
) -> UserRole:
    role_id = await _role_item_id(session, role_name)
    status_id = await _active_status_id(session) if active else await _inactive_status_id(session)

    result = await session.execute(
        select(UserRole).where(
            UserRole.user_id == int(user_id),
            UserRole.role_id == role_id,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        row.status_id = status_id
        return row

    row = UserRole(
        user_id=int(user_id),
        role_id=role_id,
        created_by=int(created_by),
        status_id=status_id,
    )
    session.add(row)
    await session.flush()
    return row


async def ensure_default_supporter_role(session: AsyncSession, user_id: int) -> None:
    await ensure_role(
        session,
        user_id=user_id,
        role_name=ROLE_SUPPORTER,
        created_by=user_id,
        active=True,
    )


async def set_product_role(
    session: AsyncSession,
    *,
    user_id: int,
    role_name: str,
    actor_id: int | None = None,
) -> None:
    """Activa supporter XOR athlete; deja admin intacto."""
    name = str(role_name).strip().lower()
    if name not in PRODUCT_ROLES:
        raise BusinessLogicError("Rol de producto no válido (supporter|athlete).")

    actor = int(actor_id or user_id)
    other = ROLE_ATHLETE if name == ROLE_SUPPORTER else ROLE_SUPPORTER

    await ensure_role(
        session, user_id=user_id, role_name=name, created_by=actor, active=True
    )
    await ensure_role(
        session, user_id=user_id, role_name=other, created_by=actor, active=False
    )


async def assign_admin(
    session: AsyncSession,
    *,
    user_id: int,
    actor_id: int | None = None,
) -> list[str]:
    await ensure_role(
        session,
        user_id=user_id,
        role_name=ROLE_ADMIN,
        created_by=int(actor_id or user_id),
        active=True,
    )
    return await get_active_role_names(session, user_id)


async def remove_admin(
    session: AsyncSession,
    *,
    user_id: int,
    actor_id: int | None = None,
) -> list[str]:
    active_id = await _active_status_id(session)
    admin_id = await _role_item_id(session, ROLE_ADMIN)
    result = await session.execute(
        select(UserRole).where(
            UserRole.role_id == admin_id,
            UserRole.status_id == active_id,
        )
    )
    active_admins = list(result.scalars().all())
    if len(active_admins) <= 1 and any(r.user_id == int(user_id) for r in active_admins):
        raise BusinessLogicError("No se puede quitar el último administrador activo.")

    await ensure_role(
        session,
        user_id=user_id,
        role_name=ROLE_ADMIN,
        created_by=int(actor_id or user_id),
        active=False,
    )
    return await get_active_role_names(session, user_id)
