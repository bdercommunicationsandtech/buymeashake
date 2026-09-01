from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.dtos import (
    BookingSessionCheckoutRequest,
    PaymentIntentResponse,
    ShakeCheckoutCreateRequest,
)
from app.services.core_services import CheckoutService

router = APIRouter()


@router.post("/checkout/create-intent", response_model=PaymentIntentResponse)
async def create_shake_intent(dto: ShakeCheckoutCreateRequest, session: DatabaseSession) -> PaymentIntentResponse:
    """Crea una intención de pago en Stripe para invitar shakes a un atleta."""
    service = CheckoutService(session)
    return await service.create_shake_intent(dto)


@router.post("/checkout/book-session", response_model=PaymentIntentResponse)
async def book_session_intent(
    dto: BookingSessionCheckoutRequest,
    user: CurrentUser,
    session: DatabaseSession,
) -> PaymentIntentResponse:
    """Inicia el checkout para reservar una asesoría o sesión 1-a-1 estilo Calendly."""
    service = CheckoutService(session)
    return await service.book_session_intent(dto, supporter_id=user.id)
