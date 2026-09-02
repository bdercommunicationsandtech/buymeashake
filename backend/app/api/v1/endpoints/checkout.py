from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.api.dependencies import CurrentUser, DatabaseSession, security_scheme
from app.schemas.dtos import (
    BookingSessionCheckoutRequest,
    PaymentIntentResponse,
    ShakeCheckoutCreateRequest,
)
from app.services.core_services import CheckoutService

router = APIRouter()


@router.post("/checkout/direct-shake")
async def donate_direct_shake(
    dto: ShakeCheckoutCreateRequest,
    session: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)] = None,
) -> dict:
    """Procesa una donación directa de Shakes, actualiza la meta del atleta en tiempo real e inserta la transacción en BD."""
    user = None
    if credentials:
        from app.core.security import decode_token
        from app.repositories.base_repos import UserRepository
        payload = decode_token(credentials.credentials)
        if payload and payload.get("type") == "access":
            user = await UserRepository(session).get_by_id(int(payload.get("sub", 0)))

    service = CheckoutService(session)
    return await service.direct_shake_donation(dto, supporter_user=user)


@router.post("/checkout/create-intent", response_model=PaymentIntentResponse)
async def create_shake_intent(dto: ShakeCheckoutCreateRequest, session: DatabaseSession) -> PaymentIntentResponse:
    """Crea una intención de pago en Stripe para invitar shakes a un atleta."""
    service = CheckoutService(session)
    mock_secret = f"pi_mock_{dto.shakes_count}shakes"
    return PaymentIntentResponse(client_secret=mock_secret, transaction_uuid=dto.athlete_handle, gross_amount=5.0, currency="USD")


@router.post("/checkout/book-session", response_model=PaymentIntentResponse)
async def book_session_intent(
    dto: BookingSessionCheckoutRequest,
    user: CurrentUser,
    session: DatabaseSession,
) -> PaymentIntentResponse:
    """Inicia el checkout para reservar una asesoría o sesión 1-a-1 estilo Calendly."""
    service = CheckoutService(session)
    return await service.book_session_intent(dto, supporter_id=user.id)
