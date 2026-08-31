from typing import Annotated, Literal
from fastapi import APIRouter, File, Query, UploadFile, status

from app.api.dependencies import CurrentAthlete, CurrentUser, DatabaseSession
from app.schemas.dtos import (
    AppVersionCheckResponse,
    AthleteLeaderboardItemResponse,
    AthleteProfileFullResponse,
    AthleteProfileUpdateRequest,
    BookingAppointmentResponse,
    BookingServiceCreateRequest,
    BookingServiceFullResponse,
    BookingSessionCheckoutRequest,
    CreatorPublicProfileResponse,
    DashboardMetricsResponse,
    DigitalProductCreateRequest,
    DigitalProductResponse,
    GoalCreateRequest,
    GoalResponse,
    LookupGroupResponse,
    MembershipTierCreateRequest,
    MembershipTierResponse,
    PaymentIntentResponse,
    ReferralDashboardResponse,
    RefreshTokenRequest,
    ShakeCheckoutCreateRequest,
    TokenResponse,
    UploadFileResponse,
    UserLoginRequest,
    UserMeResponse,
    UserRegisterRequest,
)
from app.services.core_services import (
    AthleteService,
    AuthService,
    CheckoutService,
    DashboardService,
    StorageService,
    SystemService,
)

router = APIRouter()


# ==============================================================================
# 1. AUTENTICACIÓN & USUARIOS
# ==============================================================================

@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, tags=["Auth"])
async def register(dto: UserRegisterRequest, session: DatabaseSession) -> TokenResponse:
    """Registra una nueva cuenta de usuario (Supporter o Atleta)."""
    service = AuthService(session)
    return await service.register(dto)


@router.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(dto: UserLoginRequest, session: DatabaseSession) -> TokenResponse:
    """Inicia sesión con credenciales y retorna tokens JWT."""
    service = AuthService(session)
    return await service.login(dto)


@router.post("/auth/refresh", response_model=TokenResponse, tags=["Auth"])
async def refresh_token(dto: RefreshTokenRequest, session: DatabaseSession) -> TokenResponse:
    """Renueva un Access Token utilizando el Refresh Token."""
    service = AuthService(session)
    return await service.refresh_token(dto)


@router.get("/auth/me", response_model=UserMeResponse, tags=["Auth"])
async def get_me(user: CurrentUser, session: DatabaseSession) -> UserMeResponse:
    """Obtiene los datos del usuario autenticado actual."""
    service = AuthService(session)
    return await service.get_me(user)


# ==============================================================================
# 2. CATÁLOGOS & SISTEMA (APP MÓVIL)
# ==============================================================================

@router.get("/system/lookups", response_model=list[LookupGroupResponse], tags=["System"])
async def get_all_lookups(session: DatabaseSession) -> list[LookupGroupResponse]:
    """Retorna todos los catálogos del sistema con códigos enteros (Deportes, Transacciones, etc.)."""
    service = SystemService(session)
    return await service.get_all_lookups()


@router.get("/system/app-version/check", response_model=AppVersionCheckResponse, tags=["System"])
async def check_app_version(
    platform: Literal["ios", "android", "web"],
    version_code: int,
    session: DatabaseSession,
) -> AppVersionCheckResponse:
    """Verifica si la versión móvil requiere actualización obligatoria."""
    service = SystemService(session)
    return await service.check_app_version(platform, version_code)


# ==============================================================================
# 3. EXPLORACIÓN & CREADORES
# ==============================================================================

@router.get("/explore/leaderboard", response_model=list[AthleteLeaderboardItemResponse], tags=["Explore"])
async def get_monthly_leaderboard(
    session: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[AthleteLeaderboardItemResponse]:
    """Retorna el Top 10 mensual de atletas ordenado por número de shakes recibidos."""
    service = AthleteService(session)
    return await service.get_monthly_leaderboard(limit)


@router.get("/creators/{handle}", response_model=CreatorPublicProfileResponse, tags=["Creators"])
async def get_creator_profile(handle: str, session: DatabaseSession) -> CreatorPublicProfileResponse:
    """Retorna el perfil público completo de un atleta, su meta activa y servicios 1-a-1."""
    service = AthleteService(session)
    return await service.get_by_handle(handle)


# ==============================================================================
# 4. CHECKOUT & RESERVAS
# ==============================================================================

@router.post("/checkout/create-intent", response_model=PaymentIntentResponse, tags=["Checkout"])
async def create_shake_intent(dto: ShakeCheckoutCreateRequest, session: DatabaseSession) -> PaymentIntentResponse:
    """Crea una intención de pago en Stripe para invitar shakes a un atleta."""
    service = CheckoutService(session)
    return await service.create_shake_intent(dto)


@router.post("/checkout/book-session", response_model=PaymentIntentResponse, tags=["Checkout"])
async def book_session_intent(
    dto: BookingSessionCheckoutRequest,
    user: CurrentUser,
    session: DatabaseSession,
) -> PaymentIntentResponse:
    """Inicia el checkout para reservar una asesoría o sesión 1-a-1 estilo Calendly."""
    service = CheckoutService(session)
    return await service.book_session_intent(dto, supporter_id=user.id)


# ==============================================================================
# 5. DASHBOARD DEL ATLETA (ENDPOINTS PROTEGIDOS)
# ==============================================================================

@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse, tags=["Dashboard"])
async def get_dashboard_metrics(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> DashboardMetricsResponse:
    """Obtiene el resumen financiero de los últimos 30 días, MRR y desglose por tipo."""
    service = DashboardService(session)
    return await service.get_metrics(athlete)


@router.get("/dashboard/profile", response_model=AthleteProfileFullResponse, tags=["Dashboard"])
async def get_my_profile(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> AthleteProfileFullResponse:
    """Obtiene la configuración y datos completos del perfil del atleta."""
    service = DashboardService(session)
    return await service.get_profile(athlete)


@router.put("/dashboard/profile", response_model=AthleteProfileFullResponse, tags=["Dashboard"])
async def update_my_profile(
    dto: AthleteProfileUpdateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> AthleteProfileFullResponse:
    """Actualiza la biografía, precio unitario de shake, moneda, ciudad o avatar del atleta."""
    service = DashboardService(session)
    return await service.update_profile(athlete, dto)


@router.get("/dashboard/goals", response_model=list[GoalResponse], tags=["Dashboard"])
async def get_my_goals(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[GoalResponse]:
    """Obtiene el historial de metas deportivas del atleta y su progreso actual."""
    service = DashboardService(session)
    return await service.get_goals(athlete)


@router.post("/dashboard/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED, tags=["Dashboard"])
async def create_my_goal(
    dto: GoalCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> GoalResponse:
    """Crea una nueva meta deportiva activa para recaudar fondos."""
    service = DashboardService(session)
    return await service.create_goal(athlete, dto)


@router.get("/dashboard/memberships/tiers", response_model=list[MembershipTierResponse], tags=["Dashboard"])
async def get_my_membership_tiers(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[MembershipTierResponse]:
    """Obtiene todos los niveles de membresía creados por el atleta."""
    service = DashboardService(session)
    return await service.get_tiers(athlete)


@router.post("/dashboard/memberships/tiers", response_model=MembershipTierResponse, status_code=status.HTTP_201_CREATED, tags=["Dashboard"])
async def create_membership_tier(
    dto: MembershipTierCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> MembershipTierResponse:
    """Crea un nuevo nivel de suscripción recurrente con su lista de beneficios."""
    service = DashboardService(session)
    return await service.create_tier(athlete, dto)


@router.get("/dashboard/shop/products", response_model=list[DigitalProductResponse], tags=["Dashboard"])
async def get_my_shop_products(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[DigitalProductResponse]:
    """Obtiene los productos digitales que el atleta tiene en su tienda."""
    service = DashboardService(session)
    return await service.get_products(athlete)


@router.post("/dashboard/shop/products", response_model=DigitalProductResponse, status_code=status.HTTP_201_CREATED, tags=["Dashboard"])
async def create_shop_product(
    dto: DigitalProductCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> DigitalProductResponse:
    """Publica un nuevo producto digital (PDF, rutina, plantilla Notion)."""
    service = DashboardService(session)
    return await service.create_product(athlete, dto)


@router.get("/dashboard/bookings/services", response_model=list[BookingServiceFullResponse], tags=["Dashboard"])
async def get_my_booking_services(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[BookingServiceFullResponse]:
    """Lista todos los servicios de videollamada 1-a-1 ofrecidos por el atleta."""
    service = DashboardService(session)
    return await service.get_booking_services(athlete)


@router.post("/dashboard/bookings/services", response_model=BookingServiceFullResponse, status_code=status.HTTP_201_CREATED, tags=["Dashboard"])
async def create_my_booking_service(
    dto: BookingServiceCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> BookingServiceFullResponse:
    """Crea un nuevo servicio de asesoría 1-a-1 con disponibilidad semanal (estilo Calendly)."""
    service = DashboardService(session)
    return await service.create_booking_service(athlete, dto)


@router.get("/dashboard/bookings/appointments", response_model=list[BookingAppointmentResponse], tags=["Dashboard"])
async def get_my_booking_appointments(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[BookingAppointmentResponse]:
    """Obtiene la agenda de citas y videollamadas confirmadas con seguidores."""
    service = DashboardService(session)
    return await service.get_appointments(athlete)


@router.get("/dashboard/referrals", response_model=ReferralDashboardResponse, tags=["Dashboard"])
async def get_my_referrals_dashboard(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> ReferralDashboardResponse:
    """Obtiene estadísticas del programa de referidos, atletas invitados y comisiones generadas."""
    service = DashboardService(session)
    return await service.get_referrals(athlete)


# ==============================================================================
# 6. SUBIDA DE ARCHIVOS & MULTIMEDIA
# ==============================================================================

@router.post("/uploads/image", response_model=UploadFileResponse, tags=["Uploads"])
async def upload_image(
    file: UploadFile = File(...),
    user: CurrentUser = None,
) -> UploadFileResponse:
    """Sube una imagen de avatar, portada o logo (JPEG, PNG, WEBP)."""
    file_bytes = await file.read()
    return await StorageService.save_image(file_bytes, file.filename or "image.png", file.content_type or "image/png")


@router.post("/uploads/product", response_model=UploadFileResponse, tags=["Uploads"])
async def upload_digital_product_file(
    file: UploadFile = File(...),
    athlete: CurrentAthlete = None,
) -> UploadFileResponse:
    """Sube un archivo de producto digital (PDF, ZIP de rutinas)."""
    file_bytes = await file.read()
    return await StorageService.save_product_file(file_bytes, file.filename or "file.pdf", file.content_type or "application/pdf")

