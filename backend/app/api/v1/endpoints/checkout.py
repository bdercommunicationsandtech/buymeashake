from typing import Annotated
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials
import stripe

from app.api.dependencies import CurrentAthlete, CurrentUser, DatabaseSession, security_scheme
from app.core.config import settings
from app.core.exceptions import EntityNotFoundError
from app.repositories.base_repos import AthleteRepository, MembershipRepository
from app.schemas.dtos import (
    BookingSessionCheckoutRequest,
    CustomerPortalResponse,
    PaymentIntentResponse,
    ShakeCheckoutCreateRequest,
    StripeCheckoutSessionResponse,
    StripeConnectLinkResponse,
    StripeConnectStatusResponse,
    SubscriptionCheckoutRequest,
)
from app.services.core_services import CheckoutService
from app.services.stripe_service import StripeService

router = APIRouter()


@router.post("/checkout/direct-shake")
async def donate_direct_shake(
    dto: ShakeCheckoutCreateRequest,
    session: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)] = None,
) -> dict:
    """Procesa una donación directa de Shakes (modo simulado o local)."""
    user = None
    if credentials:
        from app.core.security import decode_token
        from app.repositories.base_repos import UserRepository
        payload = decode_token(credentials.credentials)
        if payload and payload.get("type") == "access":
            user = await UserRepository(session).get_by_id(int(payload.get("sub", 0)))

    service = CheckoutService(session)
    return await service.direct_shake_donation(dto, supporter_user=user)


@router.post("/checkout/stripe-session", response_model=StripeCheckoutSessionResponse)
async def create_stripe_checkout_session(
    dto: ShakeCheckoutCreateRequest,
    session: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)] = None,
) -> StripeCheckoutSessionResponse:
    """Genera una sesión alojada de Stripe Checkout para comprar Shakes con tarjeta."""
    user = None
    if credentials:
        from app.core.security import decode_token
        from app.repositories.base_repos import UserRepository
        payload = decode_token(credentials.credentials)
        if payload and payload.get("type") == "access":
            user = await UserRepository(session).get_by_id(int(payload.get("sub", 0)))

    athlete = await AthleteRepository(session).get_by_handle(dto.athlete_handle)
    if not athlete:
        raise EntityNotFoundError("Atleta", dto.athlete_handle)

    stripe_svc = StripeService(session)
    res = await stripe_svc.create_shake_checkout_session(
        athlete=athlete,
        shakes_count=dto.shakes_count,
        currency=dto.currency,
        supporter_name=dto.supporter_name,
        supporter_email=dto.supporter_email,
        supporter_message=dto.supporter_message,
        is_anonymous=dto.is_anonymous,
        supporter_user=user,
    )
    return StripeCheckoutSessionResponse(**res)


@router.post("/checkout/subscription-session", response_model=StripeCheckoutSessionResponse)
async def create_subscription_checkout_session(
    dto: SubscriptionCheckoutRequest,
    session: DatabaseSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)] = None,
) -> StripeCheckoutSessionResponse:
    """Genera una sesión de Stripe Checkout en modo suscripción mensual para un Tier."""
    user = None
    if credentials:
        from app.core.security import decode_token
        from app.repositories.base_repos import UserRepository
        payload = decode_token(credentials.credentials)
        if payload and payload.get("type") == "access":
            user = await UserRepository(session).get_by_id(int(payload.get("sub", 0)))

    membership_repo = MembershipRepository(session)
    tier = await membership_repo.get_tier_by_id(dto.tier_id)
    if not tier:
        raise EntityNotFoundError("Nivel de Membresía", dto.tier_id)

    athlete = tier.athlete
    if not athlete:
        athlete = await AthleteRepository(session).get_by_id(tier.athlete_id)

    stripe_svc = StripeService(session)
    res = await stripe_svc.create_subscription_checkout_session(
        athlete=athlete,
        tier=tier,
        supporter_user=user,
        supporter_email=dto.supporter_email,
        supporter_name=dto.supporter_name,
    )
    return StripeCheckoutSessionResponse(**res)


@router.post("/checkout/billing-portal", response_model=CustomerPortalResponse)
async def create_customer_portal_session(
    user: CurrentUser,
    session: DatabaseSession,
) -> CustomerPortalResponse:
    """Genera la URL del portal oficial de Stripe para que el suscriptor gestione o cancele sus membresías."""
    stripe_svc = StripeService(session)
    portal_url = await stripe_svc.create_customer_portal_session(user=user)
    return CustomerPortalResponse(portal_url=portal_url)


@router.post("/checkout/verify-session")
async def verify_stripe_session(
    session: DatabaseSession,
    session_id: Annotated[str, Query(description="Stripe Checkout Session ID (cs_...)")],
) -> dict:
    """Verifica directamente el estado de una sesión de Stripe al volver a la web y actualiza la meta."""
    import logging
    logger = logging.getLogger("uvicorn.error")
    logger.info(">>> LLAMADA RECIBIDA EN /checkout/verify-session CON session_id=%s", session_id)
    stripe_svc = StripeService(session)
    result = await stripe_svc.verify_and_process_session(session_id)
    await session.commit()
    logger.info(">>> RESULTADO COMMIT /checkout/verify-session: %s", result)
    return result



@router.post("/checkout/stripe-webhook")
async def stripe_webhook(
    request: Request,
    session: DatabaseSession,
    stripe_signature: Annotated[str | None, Header(alias="stripe-signature")] = None,
) -> dict:
    """Webhook oficial de Stripe para confirmar pagos y actualizar la Meta (Goal) del atleta."""
    payload = await request.body()

    # Si estamos en modo de desarrollo con placeholder y sin signature, procesamos el json directo
    if not settings.STRIPE_WEBHOOK_SECRET or settings.STRIPE_WEBHOOK_SECRET.startswith("whsec_placeholder"):
        import json
        try:
            event = json.loads(payload)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON payload")
    else:
        if not stripe_signature:
            raise HTTPException(status_code=400, detail="Missing stripe-signature header")
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")

    stripe_svc = StripeService(session)
    result = await stripe_svc.handle_stripe_event(event)
    await session.commit()
    return result


@router.post("/dashboard/payouts/connect-link", response_model=StripeConnectLinkResponse)
async def get_stripe_connect_onboarding_link(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> StripeConnectLinkResponse:
    """Genera el enlace de Stripe Connect Express para que el atleta conecte su cuenta bancaria."""
    stripe_svc = StripeService(session)
    data = await stripe_svc.generate_connect_onboarding_link(athlete)
    await session.commit()
    return StripeConnectLinkResponse(**data)


@router.get("/dashboard/payouts/status", response_model=StripeConnectStatusResponse)
async def get_stripe_connect_status(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> StripeConnectStatusResponse:
    """Verifica el estado de la cuenta Connect del atleta (si ya puede recibir transferencias)."""
    stripe_svc = StripeService(session)
    status_data = await stripe_svc.get_connect_account_status(athlete)
    await session.commit()
    return StripeConnectStatusResponse(**status_data)


@router.post("/checkout/create-intent", response_model=PaymentIntentResponse)
async def create_shake_intent(dto: ShakeCheckoutCreateRequest, session: DatabaseSession) -> PaymentIntentResponse:
    """Crea una intención de pago en Stripe para invitar shakes a un atleta."""
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
