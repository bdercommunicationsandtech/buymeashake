from fastapi import APIRouter, status

from app.api.dependencies import CurrentAthlete, DatabaseSession
from app.schemas.dtos import (
    AthleteProfileFullResponse,
    AthleteProfileUpdateRequest,
    BookingAppointmentResponse,
    BookingServiceCreateRequest,
    BookingServiceFullResponse,
    DigitalProductCreateRequest,
    DigitalProductResponse,
    DashboardMetricsResponse,
    GoalCreateRequest,
    GoalResponse,
    GoalUpdateRequest,
    MembershipTierCreateRequest,
    MembershipTierResponse,
    NotificationResponse,
    PostCreateRequest,
    PostResponse,
    ReferralDashboardResponse,
    ReplySupporterRequest,
    SupportersDashboardResponse,
)
from app.services.core_services import DashboardService

router = APIRouter()


@router.get("/dashboard/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> DashboardMetricsResponse:
    """Obtiene el resumen financiero de los últimos 30 días, MRR y desglose por tipo."""
    service = DashboardService(session)
    return await service.get_metrics(athlete)


@router.get("/dashboard/profile", response_model=AthleteProfileFullResponse)
async def get_my_profile(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> AthleteProfileFullResponse:
    """Obtiene la configuración y datos completos del perfil del atleta."""
    service = DashboardService(session)
    return await service.get_profile(athlete)


@router.put("/dashboard/profile", response_model=AthleteProfileFullResponse)
async def update_my_profile(
    dto: AthleteProfileUpdateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> AthleteProfileFullResponse:
    """Actualiza la biografía, precio unitario de shake, moneda, ciudad o avatar del atleta."""
    service = DashboardService(session)
    return await service.update_profile(athlete, dto)


@router.get("/dashboard/goals", response_model=list[GoalResponse])
async def get_my_goals(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[GoalResponse]:
    """Obtiene el historial de metas deportivas del atleta y su progreso actual."""
    service = DashboardService(session)
    return await service.get_goals(athlete)


@router.post("/dashboard/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_my_goal(
    dto: GoalCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> GoalResponse:
    """Crea una nueva meta deportiva activa para recaudar fondos."""
    service = DashboardService(session)
    return await service.create_goal(athlete, dto)


@router.put("/dashboard/goals/{goal_id}", response_model=GoalResponse)
async def update_my_goal(
    goal_id: int,
    dto: GoalUpdateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> GoalResponse:
    """Actualiza o activa/desactiva una meta deportiva existente."""
    service = DashboardService(session)
    return await service.update_goal(athlete, goal_id, dto)


@router.get("/dashboard/memberships/tiers", response_model=list[MembershipTierResponse])
async def get_my_membership_tiers(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[MembershipTierResponse]:
    """Obtiene todos los niveles de membresía creados por el atleta."""
    service = DashboardService(session)
    return await service.get_tiers(athlete)


@router.post(
    "/dashboard/memberships/tiers",
    response_model=MembershipTierResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_membership_tier(
    dto: MembershipTierCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> MembershipTierResponse:
    """Crea un nuevo nivel de suscripción recurrente con su lista de beneficios."""
    service = DashboardService(session)
    return await service.create_tier(athlete, dto)


@router.get("/dashboard/shop/products", response_model=list[DigitalProductResponse])
async def get_my_shop_products(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[DigitalProductResponse]:
    """Obtiene los productos digitales que el atleta tiene en su tienda."""
    service = DashboardService(session)
    return await service.get_products(athlete)


@router.post(
    "/dashboard/shop/products",
    response_model=DigitalProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_shop_product(
    dto: DigitalProductCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> DigitalProductResponse:
    """Publica un nuevo producto digital (PDF, rutina, plantilla Notion)."""
    service = DashboardService(session)
    return await service.create_product(athlete, dto)


@router.get("/dashboard/bookings/services", response_model=list[BookingServiceFullResponse])
async def get_my_booking_services(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[BookingServiceFullResponse]:
    """Lista todos los servicios de videollamada 1-a-1 ofrecidos por el atleta."""
    service = DashboardService(session)
    return await service.get_booking_services(athlete)


@router.post(
    "/dashboard/bookings/services",
    response_model=BookingServiceFullResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_booking_service(
    dto: BookingServiceCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> BookingServiceFullResponse:
    """Crea un nuevo servicio de asesoría 1-a-1 con disponibilidad semanal (estilo Calendly)."""
    service = DashboardService(session)
    return await service.create_booking_service(athlete, dto)


@router.get("/dashboard/bookings/appointments", response_model=list[BookingAppointmentResponse])
async def get_my_booking_appointments(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[BookingAppointmentResponse]:
    """Obtiene la agenda de citas y videollamadas confirmadas con seguidores."""
    service = DashboardService(session)
    return await service.get_appointments(athlete)


@router.get("/dashboard/referrals", response_model=ReferralDashboardResponse)
async def get_my_referrals_dashboard(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> ReferralDashboardResponse:
    """Obtiene estadísticas del programa de referidos, atletas invitados y comisiones generadas."""
    service = DashboardService(session)
    return await service.get_referrals(athlete)


@router.get("/dashboard/posts", response_model=list[PostResponse])
async def get_my_posts(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[PostResponse]:
    """Lista las publicaciones del atleta."""
    service = DashboardService(session)
    return await service.get_posts(athlete)


@router.post("/dashboard/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_my_post(
    dto: PostCreateRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> PostResponse:
    """Crea una nueva publicación."""
    service = DashboardService(session)
    return await service.create_post(athlete, dto)


@router.get("/dashboard/supporters", response_model=SupportersDashboardResponse)
async def get_my_supporters(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> SupportersDashboardResponse:
    """Resumen y listado de apoyos one-time (shakes)."""
    service = DashboardService(session)
    return await service.get_supporters(athlete)


@router.post("/dashboard/supporters/{transaction_id}/reply")
async def reply_to_supporter(
    transaction_id: int,
    dto: ReplySupporterRequest,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> dict:
    """Responde al mensaje de un supporter."""
    service = DashboardService(session)
    return await service.reply_to_supporter(athlete, transaction_id, dto.reply_text)


@router.post("/dashboard/supporters/{transaction_id}/like")
async def toggle_like_supporter(
    transaction_id: int,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> dict:
    """Da o quita corazón (like) a un mensaje de supporter."""
    service = DashboardService(session)
    return await service.toggle_like_supporter(athlete, transaction_id)


@router.get("/dashboard/notifications", response_model=list[NotificationResponse])
async def get_my_notifications(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[NotificationResponse]:
    """Obtiene las notificaciones del atleta (shakes recibidos, nuevos seguidores)."""
    from app.repositories.base_repos import NotificationRepository
    repo = NotificationRepository(session)
    notifs = await repo.get_by_user_id(athlete.user_id)
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.put("/dashboard/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> dict:
    """Marca una notificación como leída."""
    from app.repositories.base_repos import NotificationRepository
    repo = NotificationRepository(session)
    await repo.mark_read(notification_id, athlete.user_id)
    return {"success": True}
