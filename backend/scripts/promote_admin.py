"""
Asigna (o reactiva) el rol admin a un usuario por email.

Uso:
    cd backend
    .venv\\Scripts\\python.exe scripts/promote_admin.py user@example.com
"""
from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.entities import User
from app.services import user_roles_service as user_roles


async def promote(email: str) -> None:
    clean = email.strip().lower()
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == clean))
        user = result.scalar_one_or_none()
        if not user:
            raise SystemExit(f"Usuario no encontrado: {clean}")

        names = await user_roles.get_active_role_names(session, user.id)
        if not any(r in user_roles.PRODUCT_ROLES for r in names):
            await user_roles.ensure_default_supporter_role(session, user.id)

        roles = await user_roles.assign_admin(session, user_id=user.id, actor_id=user.id)
        await session.commit()
        print(f"OK: {clean} → roles activos: {', '.join(roles)}")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python scripts/promote_admin.py <email>")
    asyncio.run(promote(sys.argv[1]))


if __name__ == "__main__":
    main()
