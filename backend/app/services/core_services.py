import secrets
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    EntityAlreadyExistsError,
    EntityNotFoundError,
    RateLimitExceededError,
    UnauthorizedError,
)
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
    FollowRepository,
    GoalRepository,
    LookupRepository,
    MembershipRepository,
    OtpRepository,
    PostRepository,
    ReferralRepository,
    ShopRepository,
    SupporterRepository,
    UserRepository,
)
from app.services.email_service import send_otp_email, send_thank_you_email
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
    FollowedAthleteResponse,
    GoalCreateRequest,
    GoalResponse,
    GoalUpdateRequest,
    LookupGroupResponse,
    LookupItemResponse,
    MembershipTierCreateRequest,
    MembershipTierResponse,
    PaginatedResponse,
    PaymentIntentResponse,
    PostCommentResponse,
    PostCreateRequest,
    PostResponse,
    ReferralDashboardResponse,
    RefreshTokenRequest,
    RequestOtpRequest,
    RequestOtpResponse,
    ShakeCheckoutCreateRequest,
    SupporterItemResponse,
    SupportersDashboardResponse,
    TokenResponse,
    UpdateProfileRequest,
    UploadFileResponse,
    UserLoginRequest,
    UserMeResponse,
    UserRegisterRequest,
    VerifyOtpRequest,
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

        role_code = 20 if dto.role == "athlete" else 10
        user = User(
            email=dto.email,
            password_hash=get_password_hash(dto.password),
            full_name=dto.full_name,
            role=dto.role,
            role_code=role_code,
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

    async def request_otp(self, dto: RequestOtpRequest) -> RequestOtpResponse:
        otp_repo = OtpRepository(self.session)

        # 1. Limpieza preventiva de registros expirados (>24h)
        await otp_repo.clean_expired_otps()

        # 2. Rate Limiting: verificar si solicitó un código hace menos de 60 segundos
        latest = await otp_repo.get_latest_active_otp(dto.email, purpose="supporter_follow")
        if latest and latest.created_at:
            time_since_last = (datetime.now() - latest.created_at).total_seconds()
            if time_since_last < 60:
                wait_time = int(60 - time_since_last)
                raise RateLimitExceededError(wait_seconds=wait_time, message=f"Por favor espera {wait_time} segundos antes de solicitar otro código.")

        # 3. Invalidar cualquier código anterior pendiente de este correo
        await otp_repo.invalidate_previous_otps(dto.email, purpose="supporter_follow")

        # 4. Generar nuevo código numérico de 6 dígitos con vigencia de 15 min
        code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = datetime.now() + timedelta(minutes=15)
        metadata = {
            "name": dto.name,
            "athlete_handle": dto.athlete_handle,
        }
        await otp_repo.create(
            email=dto.email,
            code=code,
            purpose="supporter_follow",
            metadata=metadata,
            expires_at=expires_at,
        )

        # 5. Enviar correo HTML estilizado con el servicio SMTP del proyecto
        from app.services.email_service import send_otp_email
        await send_otp_email(to_email=dto.email, code=code, athlete_name=dto.name or dto.athlete_handle)

        return RequestOtpResponse(
            message=f"Código de 6 dígitos enviado a {dto.email}",
            expires_in_seconds=900,
            demo_code=code,
        )

    async def verify_otp(self, dto: VerifyOtpRequest) -> TokenResponse:
        otp_repo = OtpRepository(self.session)
        otp_record = await otp_repo.get_valid_otp(dto.email, dto.code)
        if not otp_record:
            raise UnauthorizedError("El código de verificación es inválido o ha expirado.")

        await otp_repo.mark_used(otp_record)

        # Buscar usuario o crearlo como supporter
        user = await self.user_repo.get_by_email(dto.email)
        metadata = otp_record.metadata_ or {}
        name = metadata.get("name") or "Supporter"

        if not user:
            # Crear usuario supporter
            user = User(
                email=dto.email,
                password_hash=get_password_hash(secrets.token_urlsafe(16)),
                full_name=name,
                role="supporter",
                role_code=10,
                is_email_verified=True,
            )
            await self.user_repo.create(user)
        else:
            user.is_email_verified = True

        # Si venía de seguir a un atleta, vincular el follow
        athlete_handle = metadata.get("athlete_handle")
        if athlete_handle:
            athlete = await self.athlete_repo.get_by_handle(athlete_handle)
            if athlete and athlete.user_id != user.id:
                follow_repo = FollowRepository(self.session)
                await follow_repo.follow(supporter_id=user.id, athlete_id=athlete.id)

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
            role_code=getattr(user, "role_code", 10) or 10,
            is_email_verified=user.is_email_verified,
            athlete_handle=athlete_handle,
            referral_code=referral_code,
        )

    async def update_profile(self, user: User, dto: UpdateProfileRequest) -> UserMeResponse:
        if dto.full_name:
            user.full_name = dto.full_name
        if dto.avatar_url is not None:
            user.avatar_url = dto.avatar_url
        if dto.password:
            user.password_hash = get_password_hash(dto.password)

        await self.session.flush()
        return await self.get_me(user)


class SupporterService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.follow_repo = FollowRepository(session)
        self.athlete_repo = AthleteRepository(session)

    async def get_following(self, supporter_id: int) -> list[FollowedAthleteResponse]:
        athletes = await self.follow_repo.get_followed_athletes(supporter_id)
        res = []
        for a in athletes:
            name = a.user.full_name if a.user else a.handle
            avatar = a.user.avatar_url if a.user else None
            res.append(FollowedAthleteResponse(
                id=a.id,
                name=name,
                handle=a.handle,
                avatar_url=avatar,
                bio=a.bio,
            ))
        return res

    async def get_feed(self, supporter_id: int, page: int = 1, page_size: int = 10) -> PaginatedResponse[PostResponse]:
        posts, total = await self.follow_repo.get_feed_posts(supporter_id, page=page, page_size=page_size)
        items = []
        for p in posts:
            author_name = p.athlete.user.full_name if p.athlete and p.athlete.user else "Atleta"
            author_handle = p.athlete.handle if p.athlete else ""
            author_avatar = p.athlete.user.avatar_url if p.athlete and p.athlete.user else None
            
            items.append(PostResponse(
                id=p.id,
                athlete_id=p.athlete_id,
                title=p.title,
                content_html=p.content_html,
                access_type=p.access_type,
                minimum_tier_id=p.minimum_tier_id,
                likes_count=p.likes_count,
                published_at=p.published_at,
                author_name=author_name,
                author_handle=author_handle,
                author_avatar_url=author_avatar,
            ))
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1
        return PaginatedResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def check_following(self, supporter_id: int, handle: str) -> dict:
        athlete = await self.athlete_repo.get_by_handle(handle)
        if not athlete:
            return {"following": False}
        is_f = await self.follow_repo.is_following(supporter_id, athlete.id)
        return {"following": is_f}

    async def follow_athlete(self, supporter_id: int, handle: str) -> dict:
        athlete = await self.athlete_repo.get_by_handle(handle)
        if not athlete:
            raise EntityNotFoundError("Athlete", "handle", handle)
        await self.follow_repo.follow(supporter_id, athlete.id)
        return {"message": f"You are now following @{handle}", "following": True}

    async def unfollow_athlete(self, supporter_id: int, handle: str) -> dict:
        athlete = await self.athlete_repo.get_by_handle(handle)
        if not athlete:
            raise EntityNotFoundError("Athlete", "handle", handle)
        await self.follow_repo.unfollow(supporter_id, athlete.id)
        return {"message": f"You have unfollowed @{handle}", "following": False}

    async def like_post(self, post_id: int) -> dict:
        post_repo = PostRepository(self.session)
        new_likes = await post_repo.like_post(post_id)
        return {"success": True, "likes_count": new_likes}

    async def comment_post(self, user: User, post_id: int, content: str) -> PostCommentResponse:
        post_repo = PostRepository(self.session)
        post = await post_repo.get_by_id(post_id)
        if not post:
            raise EntityNotFoundError("Post", post_id)

        comment = await post_repo.add_comment(post_id, user.id, content)

        # Notificar al atleta creador del post
        if post.athlete and post.athlete.user_id and post.athlete.user_id != user.id:
            notif_repo = NotificationRepository(self.session)
            await notif_repo.create(
                user_id=post.athlete.user_id,
                title="Nuevo comentario en tu publicación",
                message=f"{user.full_name} comentó: \"{content[:80]}\"",
                type_code=401,
                action_url=f"/{post.athlete.handle}",
            )

        return PostCommentResponse(
            id=comment.id,
            post_id=comment.post_id,
            user_id=comment.user_id,
            user_name=user.full_name,
            user_avatar=user.avatar_url,
            content=comment.content,
            likes_count=comment.likes_count,
            created_at=comment.created_at,
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

        supporter_repo = SupporterRepository(self.session)
        recent_supporters_raw = await supporter_repo.get_recent_supporters(profile.id, limit=10)
        recent_supporters = [SupporterItemResponse(**s) for s in recent_supporters_raw]

        tiers = [
            MembershipTierResponse(
                id=t.id,
                name=t.name,
                description=t.description,
                monthly_price=t.monthly_price,
                currency=t.currency,
                is_active=t.is_active,
                benefits=[b.benefit_text for b in t.benefits] if t.benefits else [],
                members_count=0,
            )
            for t in profile.tiers
            if t.is_active
        ]

        products = [
            DigitalProductResponse(
                id=p.id,
                title=p.title,
                description=p.description,
                price=p.price,
                currency=p.currency,
                file_type=p.file_type,
                file_url=p.file_url,
                is_active=p.is_active,
            )
            for p in profile.products
            if p.is_active
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
            instagram_url=profile.instagram_url,
            tiktok_url=profile.tiktok_url,
            facebook_url=profile.facebook_url,
            twitter_url=profile.twitter_url,
            shake_price=profile.shake_price,
            currency=profile.currency,
            is_verified=profile.is_verified,
            active_goal_title=active_goal.title if active_goal else None,
            active_goal_target=active_goal.target_amount if active_goal else None,
            active_goal_raised=active_goal.raised_amount if active_goal else None,
            booking_services=booking_services,
            tiers=tiers,
            products=products,
            recent_supporters=recent_supporters,
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
        author_name = profile.user.full_name if profile.user else profile.handle
        return [
            self._to_post_response(p, author_name=author_name, author_handle=profile.handle)
            for p in posts
        ]

    async def get_public_post(self, handle: str, post_id: int) -> PostResponse:
        profile = await self.athlete_repo.get_by_handle(handle)
        if not profile:
            raise EntityNotFoundError("Atleta", handle)

        post_repo = PostRepository(self.session)
        post = await post_repo.get_by_id(post_id)
        if not post or post.athlete_id != profile.id:
            raise EntityNotFoundError("Publicación", post_id)

        is_members_only = (
            getattr(post, "access_type_code", 601) == 603 or post.access_type == "members_only"
        )
        if is_members_only or post.access_type != "public":
            raise EntityNotFoundError("Publicación", post_id)

        author_name = profile.user.full_name if profile.user else profile.handle
        return self._to_post_response(post, author_name=author_name, author_handle=profile.handle)

    def _to_post_response(
        self,
        post: Post,
        *,
        author_name: str | None = None,
        author_handle: str | None = None,
    ) -> PostResponse:
        return PostResponse(
            id=post.id,
            title=post.title,
            content_html=post.content_html,
            access_type=str(post.access_type),
            access_type_code=getattr(post, "access_type_code", 601) or 601,
            likes_count=post.likes_count or 0,
            published_at=post.published_at,
            is_members_only=getattr(post, "access_type_code", 601) == 603 or post.access_type == "members_only",
            author_name=author_name,
            author_handle=author_handle,
            comments=[
                PostCommentResponse(
                    id=c.id,
                    post_id=c.post_id,
                    user_id=c.user_id,
                    user_name=c.user.full_name if c.user else "Fan",
                    user_avatar=c.user.avatar_url if c.user else None,
                    content=c.content,
                    likes_count=c.likes_count,
                    created_at=c.created_at,
                )
                for c in (post.comments or [])
            ],
        )


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
            instagram_url=athlete.instagram_url,
            tiktok_url=athlete.tiktok_url,
            facebook_url=athlete.facebook_url,
            twitter_url=athlete.twitter_url,
            is_verified=athlete.is_verified,
            referral_code=athlete.referral_code,
            thank_you_message=athlete.thank_you_message,
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
        if dto.thank_you_message is not None:
            athlete.thank_you_message = dto.thank_you_message

        # Redes: permitir limpiar enviando "" (normalizado a None) si el campo vino en el request
        updates = dto.model_dump(exclude_unset=True)
        for field in ("instagram_url", "tiktok_url", "facebook_url", "twitter_url"):
            if field in updates:
                setattr(athlete, field, updates[field])

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

    async def update_goal(self, athlete: AthleteProfile, goal_id: int, dto: GoalUpdateRequest) -> GoalResponse:
        goal = await self.goal_repo.get_by_id(goal_id)
        if not goal or goal.athlete_id != athlete.id:
            raise EntityNotFoundError("Meta", str(goal_id))

        if dto.title is not None:
            goal.title = dto.title
        if dto.target_amount is not None:
            goal.target_amount = dto.target_amount
        if dto.is_active is not None:
            goal.is_active = dto.is_active

        updated = await self.goal_repo.update_goal(goal)
        return GoalResponse.model_validate(updated)

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
                access_type_code=getattr(p, "access_type_code", 601) or 601,
                likes_count=p.likes_count,
                published_at=p.published_at,
                is_members_only=getattr(p, "access_type_code", 601) == 603 or p.access_type == "members_only",
            )
            for p in posts
        ]

    async def create_post(self, athlete: AthleteProfile, dto: PostCreateRequest) -> PostResponse:
        code = 603 if dto.access_type == "members_only" else (dto.access_type_code or 601)
        access_str = "members_only" if code == 603 else "public"
        post = Post(
            athlete_id=athlete.id,
            title=dto.title.strip(),
            content_html=dto.content_html.strip() or "<p></p>",
            access_type=access_str,
            access_type_code=code,
            likes_count=0,
            published_at=datetime.utcnow(),
        )
        created = await self.post_repo.create(post)
        return PostResponse(
            id=created.id,
            title=created.title,
            content_html=created.content_html,
            access_type=str(created.access_type),
            access_type_code=created.access_type_code or code,
            likes_count=created.likes_count or 0,
            published_at=created.published_at or datetime.utcnow(),
            is_members_only=code == 603,
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

    async def reply_to_supporter(self, athlete: AthleteProfile, transaction_id: int, reply_text: str) -> dict:
        tx = await self.supporter_repo.reply_to_supporter(athlete.id, transaction_id, reply_text)
        if not tx:
            raise EntityNotFoundError("Transaction", transaction_id)

        # Notificar al supporter si tiene cuenta
        if tx.supporter_id:
            notif_repo = NotificationRepository(self.session)
            await notif_repo.create(
                user_id=tx.supporter_id,
                title=f"@{athlete.handle} te ha respondido",
                message=f"{athlete.user.full_name if athlete.user else athlete.handle}: \"{reply_text[:100]}\"",
                type_code=401,
                action_url=f"/{athlete.handle}",
            )
        return {"success": True, "message": "Reply saved successfully.", "reply": reply_text}

    async def toggle_like_supporter(self, athlete: AthleteProfile, transaction_id: int) -> dict:
        is_liked = await self.supporter_repo.toggle_like_supporter(athlete.id, transaction_id)
        return {"success": True, "is_liked": is_liked}


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

    async def direct_shake_donation(self, dto: ShakeCheckoutCreateRequest, supporter_user: User | None = None) -> dict:
        profile = await self.athlete_repo.get_by_handle(dto.athlete_handle)
        if not profile:
            raise EntityNotFoundError("Atleta", dto.athlete_handle)

        unit_price = profile.shake_price
        gross_amount = unit_price * Decimal(dto.shakes_count)
        platform_fee = (gross_amount * Decimal("0.05")).quantize(Decimal("0.01"))
        stripe_fee = Decimal("0.30") + (gross_amount * Decimal("0.029")).quantize(Decimal("0.01"))
        net_athlete = gross_amount - platform_fee - stripe_fee

        # Buscar meta activa del atleta para sumar la donación
        active_goal = next((g for g in profile.goals if g.is_active), None)
        if active_goal:
            active_goal.raised_amount = (active_goal.raised_amount or Decimal("0.00")) + gross_amount

        # Determinar ID del supporter (o None si es invitado)
        supporter_id = supporter_user.id if supporter_user else None

        tx = Transaction(
            transaction_uuid=secrets.token_hex(16),
            supporter_id=supporter_id,
            supporter_name=dto.supporter_name.strip() if dto.supporter_name else None,
            supporter_email=dto.supporter_email.strip() if dto.supporter_email else None,
            athlete_id=profile.id,
            goal_id=active_goal.id if active_goal else None,
            transaction_type_code=201,  # Shake
            shakes_count=dto.shakes_count,
            gross_amount=gross_amount,
            currency=dto.currency,
            platform_fee=platform_fee,
            stripe_fee=stripe_fee,
            net_athlete_amount=net_athlete,
            status_code=302,  # Aprobado / Succeeded
            supporter_message=dto.supporter_message,
            is_anonymous=dto.is_anonymous,
        )
        self.session.add(tx)

        # Crear notificación para el atleta
        if dto.is_anonymous:
            supporter_display_name = "Someone anonymous"
        elif dto.supporter_name and dto.supporter_name.strip():
            supporter_display_name = dto.supporter_name.strip()
        elif supporter_user:
            supporter_display_name = supporter_user.full_name
        else:
            supporter_display_name = "A Supporter"

        notif_repo = NotificationRepository(self.session)
        if profile.user_id:
            await notif_repo.create(
                user_id=profile.user_id,
                title=f"{dto.shakes_count} Shakes received!",
                message=f"{supporter_display_name} bought you {dto.shakes_count} Shakes (${gross_amount} {dto.currency}).",
                type_code=401,
                action_url=f"/dashboard/supporters",
            )

        await self.session.flush()

        # Enviar email de agradecimiento si hay correo disponible
        recipient_email = dto.supporter_email or (supporter_user.email if supporter_user else None)
        if recipient_email:
            try:
                athlete_display_name = profile.user.full_name if profile.user else profile.handle
                await send_thank_you_email(
                    to_email=recipient_email,
                    athlete_name=athlete_display_name,
                    athlete_handle=profile.handle,
                    shakes_count=dto.shakes_count,
                    thank_you_message=profile.thank_you_message,
                )
            except Exception as e:
                print(f"[ERROR SENDING THANK YOU EMAIL]: {e}")

        return {
            "success": True,
            "message": f"Successfully sent {dto.shakes_count} Shakes to @{dto.athlete_handle}!",
            "transaction_uuid": tx.transaction_uuid,
            "gross_amount": float(gross_amount),
            "new_goal_raised": float(active_goal.raised_amount) if active_goal else None,
            "thank_you_message": profile.thank_you_message or "¡Muchas gracias por tu apoyo y por ser parte de mi camino deportivo!",
            "supporter_item": {
                "id": tx.id,
                "supporter_name": supporter_display_name,
                "shakes_count": dto.shakes_count,
                "gross_amount": float(gross_amount),
                "currency": dto.currency,
                "supporter_message": dto.supporter_message,
                "is_anonymous": dto.is_anonymous,
                "created_at": datetime.now().isoformat(),
            }
        }

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


class SupporterService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.follow_repo = FollowRepository(session)
        self.athlete_repo = AthleteRepository(session)

    async def get_feed(self, supporter_id: int, page: int = 1, page_size: int = 10) -> PaginatedResponse[PostResponse]:
        posts, total = await self.follow_repo.get_feed_posts(supporter_id, page=page, page_size=page_size)
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        items = []
        for p in posts:
            author_name = None
            author_handle = None
            if p.athlete:
                author_handle = p.athlete.handle
                if p.athlete.user:
                    author_name = p.athlete.user.full_name

            items.append(
                PostResponse(
                    id=p.id,
                    title=p.title,
                    content_html=p.content_html,
                    access_type=p.access_type,
                    likes_count=p.likes_count,
                    published_at=p.published_at,
                    is_members_only=(p.access_type == "members_only"),
                    author_name=author_name,
                    author_handle=author_handle,
                )
            )

        return PaginatedResponse[PostResponse](
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def get_following(self, supporter_id: int) -> list[FollowedAthleteResponse]:
        athletes = await self.follow_repo.get_followed_athletes(supporter_id)
        return [
            FollowedAthleteResponse(
                id=a.id,
                name=a.user.full_name if a.user else a.handle,
                handle=a.handle,
                avatar_url=a.user.avatar_url if a.user else a.avatar_url,
                bio=a.bio,
                primary_sport=None,
            )
            for a in athletes
        ]

    async def follow_athlete(self, supporter_id: int, handle: str) -> dict:
        profile = await self.athlete_repo.get_by_handle(handle)
        if not profile:
            raise EntityNotFoundError("Atleta", handle)

        await self.follow_repo.follow(supporter_id=supporter_id, athlete_id=profile.id)
        return {"message": f"Ahora sigues a @{handle}", "following": True}


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

