from typing import Annotated
from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.dtos import (
    AthleteLeaderboardItemResponse,
    CreatorPublicProfileResponse,
    PaymentIntentResponse,
    ShakeCheckoutCreateRequest,
    TokenResponse,
    UserLoginRequest,
    UserMeResponse,
    UserRegisterRequest,
)
from app.services.core_services import AthleteService, AuthService, CheckoutService

router = APIRouter()

# ----------------------------------------------------------------------
# 1. Autenticación
# ----------------------------------------------------------------------
@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
async def register(dto: UserRegisterRequest, session: DatabaseSession) -> TokenResponse:
    service = AuthService(session)
    return await service.register(dto)


@router.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(dto: UserLoginRequest, session: DatabaseSession) -> TokenResponse:
    service = AuthService(session)
    return await service.login(dto)


@router.get("/auth/me", response_model=UserMeResponse, tags=["Auth"])
async def get_me(user: CurrentUser) -> UserMeResponse:
    return UserMeResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        role=user.role,
        is_email_verified=user.is_email_verified,
        athlete_handle=user.athlete_profile.handle if user.athlete_profile else None,
    )


# ----------------------------------------------------------------------
# 2. Exploración y Creadores
# ----------------------------------------------------------------------
@router.get("/explore/leaderboard", response_model=list[AthleteLeaderboardItemResponse], tags=["Explore"])
async def get_monthly_leaderboard(
    session: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[AthleteLeaderboardItemResponse]:
    service = AthleteService(session)
    return await service.get_monthly_leaderboard(limit)


@router.get("/creators/{handle}", response_model=CreatorPublicProfileResponse, tags=["Creators"])
async def get_creator_profile(handle: str, session: DatabaseSession) -> CreatorPublicProfileResponse:
    service = AthleteService(session)
    return await service.get_by_handle(handle)


# ----------------------------------------------------------------------
# 3. Checkout
# ----------------------------------------------------------------------
@router.post("/checkout/create-intent", response_model=PaymentIntentResponse, tags=["Checkout"])
async def create_shake_intent(dto: ShakeCheckoutCreateRequest, session: DatabaseSession) -> PaymentIntentResponse:
    service = CheckoutService(session)
    return await service.create_shake_intent(dto)
