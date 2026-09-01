from fastapi import APIRouter, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.dtos import (
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserMeResponse,
    UserRegisterRequest,
)
from app.services.core_services import AuthService

router = APIRouter()


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(dto: UserRegisterRequest, session: DatabaseSession) -> TokenResponse:
    """Registra una nueva cuenta de usuario (Supporter o Atleta)."""
    service = AuthService(session)
    return await service.register(dto)


@router.post("/auth/login", response_model=TokenResponse)
async def login(dto: UserLoginRequest, session: DatabaseSession) -> TokenResponse:
    """Inicia sesión con credenciales y retorna tokens JWT."""
    service = AuthService(session)
    return await service.login(dto)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(dto: RefreshTokenRequest, session: DatabaseSession) -> TokenResponse:
    """Renueva un Access Token utilizando el Refresh Token."""
    service = AuthService(session)
    return await service.refresh_token(dto)


@router.get("/auth/me", response_model=UserMeResponse)
async def get_me(user: CurrentUser, session: DatabaseSession) -> UserMeResponse:
    """Obtiene los datos del usuario autenticado actual."""
    service = AuthService(session)
    return await service.get_me(user)
