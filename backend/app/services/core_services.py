import secrets
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityAlreadyExistsError, EntityNotFoundError, UnauthorizedError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.entities import (
    AthleteProfile,
    BookingAppointment,
    BookingService,
    DigitalProduct,
    Goal,
    MembershipTier,
    Post,
    Transaction,
    User,
)
from app.repositories.base_repos import (
    AppVersionRepository,
    AthleteRepository,
    BookingRepository,
    DashboardRepository,
    GoalRepository,
    LookupRepository,
    MembershipRepository,
    PostRepository,
    ReferralRepository,
    ShopRepository,
    SupporterRepository,
    UserRepository,
)
from app.schemas.dtos import (
    AppVersionCheckResponse,
    AthleteLeaderboardItemResponse,
    AthleteProfileFullResponse,
    AthleteProfileUpdateRequest,
    BookingAppointmentResponse,
    BookingServiceCreateRequest,
    BookingServiceFullResponse,
    BookingSessionCheckoutRequest,
    CreatorBookingServiceResponse,
    CreatorPublicProfileResponse,
    DashboardMetricsResponse,
    DigitalProductCreateRequest,
    DigitalProductResponse,
    GoalCreateRequest,
    GoalResponse,
    LookupGroupResponse,
    LookupItemResponse,
    MembershipTierCreateRequest,
    MembershipTierResponse,
    PaymentIntentResponse,
    PostCreateRequest,
    PostResponse,
    ReferralDashboardResponse,
    RefreshTokenRequest,
    ShakeCheckoutCreateRequest,
    SupporterItemResponse,
    SupportersDashboardResponse,
    TokenResponse,
    UploadFileResponse,
    UserLoginRequest,
    UserMeResponse,
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

        referred_by_id = None
        if dto.referral_code:
            # Buscar atleta que lo refirió
            inviter = await self.athlete_repo.get_by_handle(dto.referral_code.split("_")[0])
            if inviter:
                referred_by_id = inviter.id

        if dto.role == "athlete":
            if not dto.handle:
                raise ValueError("El @handle es obligatorio para registrarse como atleta.")
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
                referred_by_id=referred_by_id,
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
            raise UnauthorizedError("Correo electrónico o contraseña incorrectos.")

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=60 * 24 * 7 * 60,
        )

    async def refresh_token(self, dto: RefreshTokenRequest) -> TokenResponse:
        payload = decode_token(dto.refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedError("Refresh token inválido o expirado.")

        user_id = int(payload.get("sub", 0))
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise UnauthorizedError("Usuario no encontrado.")

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=60 * 24 * 7 * 60,
        )

    async def get_me(self, user: User) -> UserMeResponse:
        athlete_handle = user.athlete_profile.handle if user.athlete_profile else None
        referral_code = user.athlete_profile.referral_code if user.athlete_profile else None

        return UserMeResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            avatar_url=user.avatar_url,
            role=user.role,
            is_email_verified=user.is_email_verified,
            athlete_handle=athlete_handle,
            referral_code=referral_code,
        )


class AthleteService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.athlete_repo = AthleteRepository(session)

    async def get_by_handle(self, handle: str) -> CreatorPublicProfileResponse:
        profile = await self.athlete_repo.get_by_handle(handle)
        if not profile:
            raise EntityNotFoundError("Atleta", handle)

        user = profile.user
        active_goal = next((g for g in profile.goals if g.is_active), None)

        booking_services = [
            CreatorBookingServiceResponse(
                id=s.id,
                title=s.title,
                description=s.description,
                duration_minutes=s.duration_minutes,
                price=s.price,
                currency=s.currency,
                platform=s.platform,
            )
            for s in profile.booking_services
            if s.is_active
        ]

        return CreatorPublicProfileResponse(
            id=profile.id,
            handle=profile.handle,
            name=user.full_name if user else "Atleta Oficial",
            bio=profile.bio,
            primary_sport="Fuerza & Levantamiento",
            city=profile.city,
            avatar_url=user.avatar_url if user else None,
            cover_image_url=profile.cover_image_url,
            shake_price=profile.shake_price,
            currency=profile.currency,
            is_verified=profile.is_verified,
            active_goal_title=active_goal.title if active_goal else None,
            active_goal_target=active_goal.target_amount if active_goal else None,
            active_goal_raised=active_goal.raised_amount if active_goal else None,
            booking_services=booking_services,
        )

    async def get_monthly_leaderboard(self, limit: int = 10) -> list[AthleteLeaderboardItemResponse]:
        raw_items = await self.athlete_repo.get_monthly_leaderboard(limit)
        return [AthleteLeaderboardItemResponse(**item) for item in raw_items]

    async def get_public_posts(self, handle: str) -> list[PostResponse]:
        profile = await self.athlete_repo.get_by_handle(handle)
        if not profile:
            raise EntityNotFoundError("Atleta", handle)

        post_repo = PostRepository(self.session)
        posts = await post_repo.get_public_by_athlete_id(profile.id)
        return [
            PostResponse(
                id=p.id,
                title=p.title,
                content_html=p.content_html,
                access_type=p.access_type,
                likes_count=p.likes_count,
                published_at=p.published_at,
                is_members_only=p.access_type == "members_only",
            )
            for p in posts
        ]


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.dash_repo = DashboardRepository(session)
        self.athlete_repo = AthleteRepository(session)
        self.user_repo = UserRepository(session)
        self.goal_repo = GoalRepository(session)
        self.membership_repo = MembershipRepository(session)
        self.shop_repo = ShopRepository(session)
        self.booking_repo = BookingRepository(session)
        self.referral_repo = ReferralRepository(session)
        self.post_repo = PostRepository(session)
        self.supporter_repo = SupporterRepository(session)

    async def get_metrics(self, athlete: AthleteProfile) -> DashboardMetricsResponse:
        metrics_dict = await self.dash_repo.get_metrics_30d(athlete.id)
        return DashboardMetricsResponse(**metrics_dict)

    # Perfil & Ajustes
    async def get_profile(self, athlete: AthleteProfile) -> AthleteProfileFullResponse:
        user = athlete.user
        return AthleteProfileFullResponse(
            id=athlete.id,
            handle=athlete.handle,
            full_name=user.full_name if user else "",
            email=user.email if user else "",
            bio=athlete.bio,
            city=athlete.city,
            primary_sport_code=athlete.primary_sport_code,
            shake_price=athlete.shake_price,
            currency=athlete.currency,
            avatar_url=user.avatar_url if user else None,
            cover_image_url=athlete.cover_image_url,
            is_verified=athlete.is_verified,
            referral_code=athlete.referral_code,
        )

    async def update_profile(self, athlete: AthleteProfile, dto: AthleteProfileUpdateRequest) -> AthleteProfileFullResponse:
        if dto.bio is not None:
            athlete.bio = dto.bio
        if dto.city is not None:
            athlete.city = dto.city
        if dto.primary_sport_code is not None:
            athlete.primary_sport_code = dto.primary_sport_code
        if dto.shake_price is not None:
            athlete.shake_price = dto.shake_price
        if dto.currency is not None:
            athlete.currency = dto.currency
        if dto.cover_image_url is not None:
            athlete.cover_image_url = dto.cover_image_url
        if dto.google_analytics_id is not None:
            athlete.google_analytics_id = dto.google_analytics_id

        if athlete.user:
            if dto.full_name is not None:
                athlete.user.full_name = dto.full_name
            if dto.avatar_url is not None:
                athlete.user.avatar_url = dto.avatar_url

        await self.athlete_repo.update(athlete)
        return await self.get_profile(athlete)

    # Metas Deportivas (Goals)
    async def get_goals(self, athlete: AthleteProfile) -> list[GoalResponse]:
        goals = await self.goal_repo.get_by_athlete_id(athlete.id)
        return [GoalResponse.model_validate(g) for g in goals]

    async def create_goal(self, athlete: AthleteProfile, dto: GoalCreateRequest) -> GoalResponse:
        goal = Goal(
            athlete_id=athlete.id,
            title=dto.title,
            target_amount=dto.target_amount,
            currency=dto.currency,
            is_active=True,
        )
        created = await self.goal_repo.create_goal(goal)
        return GoalResponse.model_validate(created)

    # Membresías
    async def get_tiers(self, athlete: AthleteProfile) -> list[MembershipTierResponse]:
        tiers = await self.membership_repo.get_by_athlete_id(athlete.id)
        return [
            MembershipTierResponse(
                id=t.id,
                name=t.name,
                description=t.description,
                monthly_price=t.monthly_price,
                currency=t.currency,
                is_active=t.is_active,
                benefits=[b.benefit_text for b in t.benefits],
                members_count=0,
            )
            for t in tiers
        ]

    async def create_tier(self, athlete: AthleteProfile, dto: MembershipTierCreateRequest) -> MembershipTierResponse:
        tier = MembershipTier(
            athlete_id=athlete.id,
            name=dto.name,
            description=dto.description,
            monthly_price=dto.monthly_price,
            currency=dto.currency,
        )
        created = await self.membership_repo.create_tier(tier, dto.benefits)
        return MembershipTierResponse(
            id=created.id,
            name=created.name,
            description=created.description,
            monthly_price=created.monthly_price,
            currency=created.currency,
            is_active=created.is_active,
            benefits=dto.benefits,
            members_count=0,
        )

    # Tienda Digital
    async def get_products(self, athlete: AthleteProfile) -> list[DigitalProductResponse]:
        products = await self.shop_repo.get_by_athlete_id(athlete.id)
        return [DigitalProductResponse.model_validate(p) for p in products]

    async def create_product(self, athlete: AthleteProfile, dto: DigitalProductCreateRequest) -> DigitalProductResponse:
        product = DigitalProduct(
            athlete_id=athlete.id,
            title=dto.title,
            description=dto.description,
            price=dto.price,
            currency=dto.currency,
            file_type=dto.file_type,
            file_url=dto.file_url,
        )
        created = await self.shop_repo.create_product(product)
        return DigitalProductResponse.model_validate(created)

    # Asesorías & Agenda
    async def get_booking_services(self, athlete: AthleteProfile) -> list[BookingServiceFullResponse]:
        services = await self.booking_repo.get_services_by_athlete(athlete.id)
        return [BookingServiceFullResponse.model_validate(s) for s in services]

    async def create_booking_service(self, athlete: AthleteProfile, dto: BookingServiceCreateRequest) -> BookingServiceFullResponse:
        service = BookingService(
            athlete_id=athlete.id,
            title=dto.title,
            description=dto.description,
            duration_minutes=dto.duration_minutes,
            price=dto.price,
            currency=dto.currency,
            platform=dto.platform,
        )
        slots = [s.model_dump() for s in dto.availabilities]
        created = await self.booking_repo.create_service(service, slots)
        return BookingServiceFullResponse.model_validate(created)

    async def get_appointments(self, athlete: AthleteProfile) -> list[BookingAppointmentResponse]:
        raw = await self.booking_repo.get_appointments_by_athlete(athlete.id)
        return [BookingAppointmentResponse(**r) for r in raw]

    # Referidos
    async def get_referrals(self, athlete: AthleteProfile) -> ReferralDashboardResponse:
        data = await self.referral_repo.get_referral_summary(athlete.id, athlete.referral_code)
        return ReferralDashboardResponse(**data)

    async def get_posts(self, athlete: AthleteProfile) -> list[PostResponse]:
        posts = await self.post_repo.get_by_athlete_id(athlete.id)
        return [
            PostResponse(
                id=p.id,
                title=p.title,
                content_html=p.content_html,
                access_type=p.access_type,
                likes_count=p.likes_count,
                published_at=p.published_at,
                is_members_only=p.access_type == "members_only",
            )
            for p in posts
        ]

    async def create_post(self, athlete: AthleteProfile, dto: PostCreateRequest) -> PostResponse:
        post = Post(
            athlete_id=athlete.id,
            title=dto.title,
            content_html=dto.content_html,
            access_type=dto.access_type,
        )
        created = await self.post_repo.create(post)
        return PostResponse(
            id=created.id,
            title=created.title,
            content_html=created.content_html,
            access_type=created.access_type,
            likes_count=created.likes_count,
            published_at=created.published_at,
            is_members_only=created.access_type == "members_only",
        )

    async def get_supporters(self, athlete: AthleteProfile) -> SupportersDashboardResponse:
        data = await self.supporter_repo.get_dashboard_summary(athlete.id)
        items = [SupporterItemResponse(**item) for item in data["items"]]
        return SupportersDashboardResponse(
            supporter_count=data["supporter_count"],
            last_30_days_total=data["last_30_days_total"],
            all_time_total=data["all_time_total"],
            currency=data["currency"],
            items=items,
        )


class SystemService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.lookup_repo = LookupRepository(session)
        self.version_repo = AppVersionRepository(session)

    async def get_all_lookups(self) -> list[LookupGroupResponse]:
        groups = await self.lookup_repo.get_all_active_groups_with_items()
        response = []
        for g in groups:
            items = [
                LookupItemResponse(
                    code=item.code,
                    label=item.label,
                    icon=item.icon,
                    sort_order=item.sort_order,
                    metadata=item.metadata_,
                )
                for item in g.items
                if item.is_active
            ]
            response.append(
                LookupGroupResponse(
                    code=g.code,
                    name=g.name,
                    description=g.description,
                    items=items,
                )
            )
        return response

    async def check_app_version(self, platform: str, current_version_code: int) -> AppVersionCheckResponse:
        latest = await self.version_repo.get_latest_by_platform(platform)
        if not latest:
            return AppVersionCheckResponse(
                update_required=False,
                force_update=False,
                latest_version="1.0.0",
                min_supported_version=100,
                store_url=None,
                release_notes=None,
            )

        update_required = current_version_code < latest.version_code
        force_update = latest.force_update or (current_version_code < latest.min_supported_version_code)

        return AppVersionCheckResponse(
            update_required=update_required,
            force_update=force_update,
            latest_version=latest.version_name,
            min_supported_version=latest.min_supported_version_code,
            store_url=latest.update_url,
            release_notes=latest.release_notes,
        )


class CheckoutService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.athlete_repo = AthleteRepository(session)
        self.booking_repo = BookingRepository(session)

    async def create_shake_intent(self, dto: ShakeCheckoutCreateRequest) -> PaymentIntentResponse:
        profile = await self.athlete_repo.get_by_handle(dto.athlete_handle)
        if not profile:
            raise EntityNotFoundError("Atleta", dto.athlete_handle)

        unit_price = profile.shake_price if dto.currency == "USD" else Decimal("50.00")
        gross_amount = unit_price * Decimal(dto.shakes_count)

        mock_client_secret = f"pi_{secrets.token_hex(12)}_secret_{secrets.token_hex(8)}"
        mock_uuid = secrets.token_hex(16)

        return PaymentIntentResponse(
            client_secret=mock_client_secret,
            transaction_uuid=mock_uuid,
            gross_amount=gross_amount,
            currency=dto.currency,
        )

    async def book_session_intent(self, dto: BookingSessionCheckoutRequest, supporter_id: int) -> PaymentIntentResponse:
        service = await self.booking_repo.get_service_by_id(dto.booking_service_id)
        if not service:
            raise EntityNotFoundError("Servicio de Asesoría", dto.booking_service_id)

        mock_client_secret = f"pi_{secrets.token_hex(12)}_secret_{secrets.token_hex(8)}"
        mock_uuid = secrets.token_hex(16)

        return PaymentIntentResponse(
            client_secret=mock_client_secret,
            transaction_uuid=mock_uuid,
            gross_amount=service.price,
            currency=dto.currency,
        )


class StorageService:
    @staticmethod
    async def save_image(file_bytes: bytes, original_filename: str, content_type: str) -> UploadFileResponse:
        import os
        allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if content_type not in allowed:
            raise ValueError(f"Formato no permitido: {content_type}. Solo se aceptan JPEG, PNG, WEBP o GIF.")

        ext = original_filename.split(".")[-1] if "." in original_filename else "png"
        unique_name = f"img_{secrets.token_hex(10)}.{ext}"
        
        static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads", "images")
        os.makedirs(static_dir, exist_ok=True)
        file_path = os.path.join(static_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return UploadFileResponse(
            url=f"/static/uploads/images/{unique_name}",
            filename=unique_name,
            content_type=content_type,
            size_bytes=len(file_bytes),
        )

    @staticmethod
    async def save_product_file(file_bytes: bytes, original_filename: str, content_type: str) -> UploadFileResponse:
        import os
        allowed = ["application/pdf", "application/zip", "application/x-zip-compressed"]
        if content_type not in allowed and not original_filename.endswith((".pdf", ".zip")):
            raise ValueError("Solo se permiten archivos PDF o ZIP para productos digitales.")

        ext = original_filename.split(".")[-1] if "." in original_filename else "pdf"
        unique_name = f"doc_{secrets.token_hex(10)}.{ext}"
        
        static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads", "products")
        os.makedirs(static_dir, exist_ok=True)
        file_path = os.path.join(static_dir, unique_name)

        with open(file_path, "wb") as f:
            f.write(file_bytes)

        return UploadFileResponse(
            url=f"/static/uploads/products/{unique_name}",
            filename=unique_name,
            content_type=content_type,
            size_bytes=len(file_bytes),
        )

