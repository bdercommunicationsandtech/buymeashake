from typing import Annotated
from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db_session
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.models.entities import AthleteProfile, User
from app.repositories.base_repos import AthleteRepository, UserRepository

security_scheme = HTTPBearer(auto_error=False)

# Anotación reutilizable para inyección de sesión de BD
DatabaseSession = Annotated[AsyncSession, Depends(get_db_session)]


async def get_current_user(
    session: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
) -> User:
    if not credentials:
        raise UnauthorizedError("Falta token de autorización Bearer.")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedError("Token inválido o expirado.")

    user_id = int(payload.get("sub", 0))
    user_repo = UserRepository(session)
    user = await user_repo.get_by_id(user_id)

    if not user:
        raise UnauthorizedError("Usuario no encontrado.")

    return user


async def get_current_athlete(
    session: DatabaseSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> AthleteProfile:
    athlete_repo = AthleteRepository(session)
    profile = await athlete_repo.get_by_user_id(current_user.id)

    if not profile:
        raise UnauthorizedError("El usuario autenticado no tiene perfil de atleta.")

    return profile


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAthlete = Annotated[AthleteProfile, Depends(get_current_athlete)]
