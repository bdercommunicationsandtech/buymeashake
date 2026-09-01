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
    MembershipTierCreateRequest,
    MembershipTierResponse,
    ReferralDashboardResponse,
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
