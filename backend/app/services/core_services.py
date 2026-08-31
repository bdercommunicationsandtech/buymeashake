import secrets
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityAlreadyExistsError, EntityNotFoundError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.models.entities import AthleteProfile, User
from app.repositories.base_repos import AthleteRepository, LookupRepository, UserRepository
from app.schemas.dtos import (
    AthleteLeaderboardItemResponse,
    CreatorPublicProfileResponse,
    PaymentIntentResponse,
    ShakeCheckoutCreateRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.athlete_repo = AthleteRepository(session)

    async def register(self, dto: UserRegisterRequest) -> TokenResponse:
        existing = await self.user_repo.get_by_email(dto.email)
        if existing:
            raise EntityAlreadyExistsError("Usuario", "email", dto.email)

        if dto.role == "athlete":
            if not dto.handle:
                raise ValueError("El handle es obligatorio para atletas.")
            existing_handle = await self.athlete_repo.get_by_handle(dto.handle)
            if existing_handle:
                raise EntityAlreadyExistsError("Atleta", "handle", dto.handle)

        user = User(
            email=dto.email,
            password_hash=get_password_hash(dto.password),
            full_name=dto.full_name,
            role=dto.role,
        )
        await self.user_repo.create(user)

        if dto.role == "athlete" and dto.handle:
            referral_code = f"{dto.handle}_{secrets.token_hex(3)}"
            athlete = AthleteProfile(
                user_id=user.id,
                handle=dto.handle,
                primary_sport_code=dto.primary_sport_code,
                referral_code=referral_code,
            )
            await self.athlete_repo.create(athlete)

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=60 * 24 * 7 * 60,
        )

    async def login(self, dto: UserLoginRequest) -> TokenResponse:
        user = await self.user_repo.get_by_email(dto.email)
        if not user or not verify_password(dto.password, user.password_hash):
            raise UnauthorizedError("Correo o contraseña incorrectos.")

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=60 * 24 * 7 * 60,
        )


class AthleteService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.athlete_repo = AthleteRepository(session)
        self.user_repo = UserRepository(session)

    async def get_by_handle(self, handle: str) -> CreatorPublicProfileResponse:
        profile = await self.athlete_repo.get_by_handle(handle)
        if not profile:
            raise EntityNotFoundError("Atleta", handle)

        user = await self.user_repo.get_by_id(profile.user_id)

        return CreatorPublicProfileResponse(
            id=profile.id,
            handle=profile.handle,
            name=user.full_name if user else "Atleta Oficial",
            bio=profile.bio,
            primary_sport="Fuerza & Acondicionamiento",
            city=profile.city,
            avatar_url=user.avatar_url if user else None,
            cover_image_url=profile.cover_image_url,
            shake_price=profile.shake_price,
            currency=profile.currency,
            is_verified=profile.is_verified,
            active_goal_title="Viaje al Campeonato Panamericano 2026",
            active_goal_target=Decimal("1200.00"),
            active_goal_raised=Decimal("780.00"),
        )

    async def get_monthly_leaderboard(self, limit: int = 10) -> list[AthleteLeaderboardItemResponse]:
        raw_items = await self.athlete_repo.get_monthly_leaderboard(limit)
        return [AthleteLeaderboardItemResponse(**item) for item in raw_items]


class CheckoutService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.athlete_repo = AthleteRepository(session)

    async def create_shake_intent(self, dto: ShakeCheckoutCreateRequest) -> PaymentIntentResponse:
        profile = await self.athlete_repo.get_by_handle(dto.athlete_handle)
        if not profile:
            raise EntityNotFoundError("Atleta", dto.athlete_handle)

        unit_price = profile.shake_price if dto.currency == "USD" else Decimal("50.00")
        gross_amount = unit_price * Decimal(dto.shakes_count)
        
        # Simulación de PaymentIntent de Stripe Connect
        mock_client_secret = f"pi_{secrets.token_hex(12)}_secret_{secrets.token_hex(8)}"
        mock_uuid = secrets.token_hex(16)

        return PaymentIntentResponse(
            client_secret=mock_client_secret,
            transaction_uuid=mock_uuid,
            gross_amount=gross_amount,
            currency=dto.currency,
        )
