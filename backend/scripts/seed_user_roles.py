"""
Siembra lookups Account Roles (600/700) y backfill de user_roles.

No depende de users.role (puede haberse eliminado). Asigna athlete si hay
athlete_profiles; si no, supporter.

Uso:
    cd backend
    python scripts/seed_user_roles.py
"""
from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.entities import AthleteProfile, LookupGroup, LookupItem, User
from app.services import user_roles_service as user_roles


async def _ensure_group(session, *, code: int, name: str, description: str) -> LookupGroup:
    result = await session.execute(select(LookupGroup).where(LookupGroup.code == code))
    group = result.scalar_one_or_none()
    if group:
        return group
    group = LookupGroup(code=code, name=name, description=description, is_active=True)
    session.add(group)
    await session.flush()
    return group


async def _ensure_item(
    session,
    *,
    group: LookupGroup,
    code: int,
    label: str,
    icon: str,
    sort_order: int,
) -> LookupItem:
    result = await session.execute(
        select(LookupItem).where(
            LookupItem.lookup_group_id == group.id,
            LookupItem.code == code,
        )
    )
    item = result.scalar_one_or_none()
    if item:
        if not item.is_active:
            item.is_active = True
        return item
    item = LookupItem(
        lookup_group_id=group.id,
        code=code,
        label=label,
        icon=icon,
        sort_order=sort_order,
        is_active=True,
    )
    session.add(item)
    await session.flush()
    return item


async def seed() -> None:
    async with async_session_factory() as session:
        roles_group = await _ensure_group(
            session,
            code=600,
            name="Account Roles",
            description="Roles de cuenta de la plataforma",
        )
        status_group = await _ensure_group(
            session,
            code=700,
            name="Account Role Statuses",
            description="Estado de una asignación en user_roles",
        )

        await _ensure_item(session, group=roles_group, code=601, label="supporter", icon="user", sort_order=1)
        await _ensure_item(session, group=roles_group, code=602, label="athlete", icon="athlete", sort_order=2)
        await _ensure_item(session, group=roles_group, code=603, label="admin", icon="shield", sort_order=3)
        await _ensure_item(session, group=status_group, code=701, label="ACTIVE", icon="check", sort_order=1)
        await _ensure_item(session, group=status_group, code=702, label="INACTIVE", icon="x", sort_order=2)

        users = (await session.execute(select(User))).scalars().all()
        athlete_user_ids = set(
            (
                await session.execute(select(AthleteProfile.user_id))
            ).scalars().all()
        )

        assigned = 0
        for user in users:
            role_name = (
                user_roles.ROLE_ATHLETE
                if user.id in athlete_user_ids
                else user_roles.ROLE_SUPPORTER
            )
            await user_roles.set_product_role(
                session,
                user_id=user.id,
                role_name=role_name,
                actor_id=user.id,
            )
            assigned += 1

        await session.commit()
        print(f"OK: lookups 600/700 listos; roles asignados a {assigned} usuario(s).")


def main() -> None:
    asyncio.run(seed())


if __name__ == "__main__":
    main()
