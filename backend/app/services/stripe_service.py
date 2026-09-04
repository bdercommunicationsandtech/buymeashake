"""Servicio integral de Stripe para BuyMeAShake (Arquitectura Dual):
1. Stripe Checkout / PaymentIntent para compra de Shakes por fans.
2. Stripe Connect Express para dispersión y retiro de ganancias de atletas.
3. Webhook handler con idempotencia y actualización automática de Goals.
"""

from decimal import Decimal
import logging
import secrets
from typing import Any

import stripe
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BusinessLogicError, EntityNotFoundError
from app.models.entities import (
    AthletePayouts,
    AthleteProfile,
    Goal,
    MembershipTier,
    Notification,
    ShakeDetails,
    Subscription,
    Transaction,
    User,
)
from app.services.profile_helpers import ensure_payouts, get_shake_price, get_thank_you

logger = logging.getLogger(__name__)

# Configurar API Key global de Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
if not settings.STRIPE_VERIFY_SSL:
    # Workaround para entornos locales/corporativos con inspección SSL (CERT_VERIFY_FAILED)
    stripe.default_http_client = stripe.new_default_http_client(verify_ssl_certs=False)
    logger.warning("Stripe SSL verification DISABLED (STRIPE_VERIFY_SSL=false)")


def _stripe_resource_id(value: Any) -> str | None:
    """Normaliza IDs de Stripe (string, dict expandido u objeto SDK) a un id string."""
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        rid = value.get("id")
        return rid if isinstance(rid, str) else None
    rid = getattr(value, "id", None)
    return rid if isinstance(rid, str) else None


def _stripe_obj_to_dict(obj: Any) -> dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    if hasattr(obj, "_to_dict_recursive"):
        return obj._to_dict_recursive()
    return dict(obj)


def _athlete_stripe_load_options():
    return (
        selectinload(AthleteProfile.user),
        selectinload(AthleteProfile.goals),
        selectinload(AthleteProfile.monetization),
        selectinload(AthleteProfile.page_settings),
        selectinload(AthleteProfile.payouts),
    )


def _shake_field(tx: Transaction, name: str, default: Any = None) -> Any:
    sd = tx.shake_details
    if not sd:
        return default
    return getattr(sd, name, default)


class StripeService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ==========================================================================
    # 1. CLIENTES (CUSTOMERS) & CHECKOUT DE SHAKES
    # ==========================================================================

    async def _get_or_create_customer(self, email: str | None, name: str | None, user: User | None = None) -> str | None:
        """Obtiene o crea un Stripe Customer para asociar las compras."""
        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return None

        # Si el usuario logueado ya tiene stripe_customer_id
        if user and user.stripe_customer_id:
            return user.stripe_customer_id

        if not email:
            return None

        try:
            # Buscar por email
            existing = stripe.Customer.list(email=email, limit=1)
            if existing and len(existing.data) > 0:
                customer_id = existing.data[0].id
            else:
                new_customer = stripe.Customer.create(
                    email=email,
                    name=name or "Supporter",
                    metadata={"source": "buymeashake"},
                )
                customer_id = new_customer.id

            if user and not user.stripe_customer_id:
                user.stripe_customer_id = customer_id
                await self.session.flush()

            return customer_id
        except Exception as e:
            logger.warning("No se pudo crear/obtener Customer en Stripe: %s", str(e))
            return None

    async def create_shake_checkout_session(
        self,
        athlete: AthleteProfile,
        shakes_count: int,
        currency: str = "USD",
        supporter_name: str | None = None,
        supporter_email: str | None = None,
        supporter_message: str | None = None,
        is_anonymous: bool = False,
        supporter_user: User | None = None,
    ) -> dict[str, str]:
        """Genera una sesión alojada de Stripe Checkout para pagar Shakes."""
        unit_price = get_shake_price(athlete)
        gross_amount = unit_price * Decimal(shakes_count)
        unit_amount_cents = int((unit_price * 100).to_integral_value())

        # Buscar meta activa del atleta
        active_goal = next((g for g in athlete.goals if g.is_active), None)
        goal_id = str(active_goal.id) if active_goal else ""

        tx_uuid = secrets.token_hex(16)
        customer_id = await self._get_or_create_customer(supporter_email, supporter_name, supporter_user)

        success_url = f"{settings.FRONTEND_URL}/{athlete.handle}?payment=success&tx={tx_uuid}&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{settings.FRONTEND_URL}/{athlete.handle}?payment=cancelled"

        # Si estamos en modo placeholder (aún sin keys válidas), devolvemos URL mock
        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return {
                "checkout_url": success_url,
                "session_id": f"cs_mock_{tx_uuid}",
                "transaction_uuid": tx_uuid,
            }

        shared_metadata = {
            "transaction_uuid": tx_uuid,
            "athlete_id": str(athlete.id),
            "athlete_handle": athlete.handle,
            "goal_id": goal_id,
            "shakes_count": str(shakes_count),
            "supporter_name": supporter_name or "",
            "supporter_email": supporter_email or "",
            "supporter_message": (supporter_message or "")[:240],
            "is_anonymous": "true" if is_anonymous else "false",
            "supporter_user_id": str(supporter_user.id) if supporter_user else "",
            "kind": "shake_donation",
        }

        session_params: dict[str, Any] = {
            "payment_method_types": ["card"],
            "line_items": [
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "product_data": {
                            "name": f"{shakes_count} Shakes para {athlete.user.full_name}",
                            "description": f"Apoyo deportivo a @{athlete.handle} en buymeashake.fit",
                        },
                        "unit_amount": unit_amount_cents,
                    },
                    "quantity": shakes_count,
                }
            ],
            "mode": "payment",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": tx_uuid,
            "metadata": shared_metadata,
            # Metadata también en PaymentIntent: webhooks payment_intent.* la necesitan
            "payment_intent_data": {
                "metadata": shared_metadata,
            },
        }

        # Si el atleta tiene cuenta Connect activa, configurar split con application_fee
        payouts = athlete.payouts
        if payouts and payouts.stripe_connect_account_id and payouts.payouts_enabled:
            total_cents = unit_amount_cents * shakes_count
            platform_fee_cents = int(Decimal(total_cents) * Decimal(str(settings.PLATFORM_FEE_PERCENTAGE)))
            session_params["payment_intent_data"]["application_fee_amount"] = platform_fee_cents
            session_params["payment_intent_data"]["transfer_data"] = {
                "destination": payouts.stripe_connect_account_id,
            }

        if customer_id:
            session_params["customer"] = customer_id
        elif supporter_email:
            session_params["customer_email"] = supporter_email

        checkout_session = stripe.checkout.Session.create(**session_params)

        # Registrar transacción pendiente: si verify/webhook fallan por red/SSL,
        # aún podemos confirmarla con el tx_uuid del success_url.
        await self._create_pending_shake_transaction(
            tx_uuid=tx_uuid,
            athlete=athlete,
            active_goal=active_goal,
            shakes_count=shakes_count,
            gross_amount=gross_amount,
            supporter_name=supporter_name,
            supporter_email=supporter_email,
            supporter_message=supporter_message,
            is_anonymous=is_anonymous,
            supporter_user_id=supporter_user.id if supporter_user else None,
            checkout_session_id=checkout_session.id,
        )

        return {
            "checkout_url": checkout_session.url or "",
            "session_id": checkout_session.id,
            "transaction_uuid": tx_uuid,
        }

    async def _create_pending_shake_transaction(
        self,
        *,
        tx_uuid: str,
        athlete: AthleteProfile,
        active_goal: Goal | None,
        shakes_count: int,
        gross_amount: Decimal,
        supporter_name: str | None,
        supporter_email: str | None,
        supporter_message: str | None,
        is_anonymous: bool,
        supporter_user_id: int | None,
        checkout_session_id: str | None = None,
    ) -> Transaction:
        platform_fee = (gross_amount * Decimal(str(settings.PLATFORM_FEE_PERCENTAGE))).quantize(Decimal("0.01"))
        stripe_fee = Decimal("0.30") + (gross_amount * Decimal("0.029")).quantize(Decimal("0.01"))
        net_athlete = gross_amount - platform_fee - stripe_fee

        tx = Transaction(
            transaction_uuid=tx_uuid,
            supporter_id=supporter_user_id,
            supporter_name=supporter_name.strip() if supporter_name else None,
            supporter_email=supporter_email.strip() if supporter_email else None,
            athlete_id=athlete.id,
            transaction_type_code=201,
            gross_amount=gross_amount,
            currency="USD",
            platform_fee=platform_fee,
            stripe_fee=stripe_fee,
            net_athlete_amount=net_athlete,
            # Mientras está pendiente guardamos el Checkout Session id (cs_...)
            # Al confirmar se reemplaza por el PaymentIntent (pi_...).
            stripe_payment_intent_id=checkout_session_id,
            status_code=301,  # Pending
        )
        self.session.add(tx)
        await self.session.flush()

        self.session.add(
            ShakeDetails(
                transaction_id=tx.id,
                shakes_count=shakes_count,
                supporter_message=supporter_message,
                is_anonymous=is_anonymous,
                goal_id=active_goal.id if active_goal else None,
            )
        )
        await self.session.flush()
        return tx

    async def reconcile_pending_shake_transactions(
        self,
        *,
        athlete_id: int | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Busca txs 301 y las confirma si Stripe reporta la Checkout Session como paid."""
        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return []

        stmt = (
            select(Transaction)
            .options(selectinload(Transaction.shake_details))
            .where(
                Transaction.status_code == 301,
                Transaction.transaction_type_code == 201,
            )
            .order_by(Transaction.id.asc())
            .limit(limit)
        )
        if athlete_id is not None:
            stmt = stmt.where(Transaction.athlete_id == athlete_id)

        result = await self.session.execute(stmt)
        pending = list(result.scalars().all())
        if not pending:
            return []

        # Índice de client_reference_id -> session para txs sin cs_ guardado
        sessions_by_ref: dict[str, Any] = {}
        try:
            listed = stripe.checkout.Session.list(limit=50)
            for s in listed.data:
                ref = getattr(s, "client_reference_id", None) or (s.get("client_reference_id") if isinstance(s, dict) else None)
                if ref:
                    sessions_by_ref[str(ref)] = s
        except Exception as e:
            logger.error("No se pudo listar Checkout Sessions para reconcile: %s", e)

        outcomes: list[dict[str, Any]] = []
        for tx in pending:
            session_id = None
            if tx.stripe_payment_intent_id and str(tx.stripe_payment_intent_id).startswith("cs_"):
                session_id = str(tx.stripe_payment_intent_id)
            else:
                matched = sessions_by_ref.get(tx.transaction_uuid)
                if matched is not None:
                    session_id = _stripe_resource_id(matched) or getattr(matched, "id", None)

            if not session_id:
                outcomes.append({"transaction_uuid": tx.transaction_uuid, "status": "no_stripe_session"})
                continue

            try:
                checkout_session = stripe.checkout.Session.retrieve(session_id)
            except Exception as e:
                outcomes.append({"transaction_uuid": tx.transaction_uuid, "status": "stripe_error", "error": str(e)})
                continue

            if checkout_session.payment_status not in ("paid", "no_payment_required"):
                outcomes.append({
                    "transaction_uuid": tx.transaction_uuid,
                    "status": "not_paid",
                    "payment_status": checkout_session.payment_status,
                })
                continue

            pi = _stripe_resource_id(checkout_session.payment_intent)
            fulfilled = await self.fulfill_pending_shake(
                tx.transaction_uuid,
                payment_intent_id=pi,
                source="reconcile_stripe",
            )
            outcomes.append(fulfilled)

        return outcomes

    async def fulfill_pending_shake(
        self,
        tx_uuid: str,
        *,
        payment_intent_id: str | None = None,
        source: str = "client_return",
    ) -> dict[str, Any]:
        """Confirma una transacción pendiente (301→302) y suma el monto a la meta."""
        existing_stmt = (
            select(Transaction)
            .options(selectinload(Transaction.shake_details))
            .where(Transaction.transaction_uuid == tx_uuid)
        )
        res = await self.session.execute(existing_stmt)
        tx = res.scalar_one_or_none()

        if not tx:
            return {"handled": False, "error": "transaction_not_found", "transaction_uuid": tx_uuid}

        shakes_count = int(_shake_field(tx, "shakes_count", 1) or 1)
        supporter_message = _shake_field(tx, "supporter_message")
        is_anonymous = bool(_shake_field(tx, "is_anonymous", False))
        goal_id = _shake_field(tx, "goal_id")

        if tx.status_code == 302:
            new_goal_raised = None
            if goal_id:
                goal_res = await self.session.execute(select(Goal).where(Goal.id == goal_id))
                existing_goal = goal_res.scalar_one_or_none()
                if existing_goal:
                    new_goal_raised = float(existing_goal.raised_amount or 0)
            return {
                "handled": True,
                "status": "already_processed",
                "transaction_uuid": tx_uuid,
                "new_goal_raised": new_goal_raised,
                "supporter_item": self._supporter_item_payload(
                    tx_id=tx.id,
                    supporter_name=tx.supporter_name,
                    shakes_count=shakes_count,
                    gross_amount=tx.gross_amount,
                    supporter_message=supporter_message,
                    is_anonymous=is_anonymous,
                ),
            }

        active_goal = None
        if goal_id:
            goal_res = await self.session.execute(select(Goal).where(Goal.id == goal_id))
            active_goal = goal_res.scalar_one_or_none()
        if not active_goal:
            athlete_stmt = (
                select(AthleteProfile)
                .options(*_athlete_stripe_load_options())
                .where(AthleteProfile.id == tx.athlete_id)
            )
            athlete_res = await self.session.execute(athlete_stmt)
            athlete = athlete_res.scalar_one_or_none()
            if athlete:
                active_goal = next((g for g in athlete.goals if g.is_active), None)

        if active_goal:
            active_goal.raised_amount = (active_goal.raised_amount or Decimal("0.00")) + tx.gross_amount
            if active_goal.target_amount and active_goal.raised_amount >= active_goal.target_amount:
                if not active_goal.achieved_at:
                    from datetime import datetime, timezone
                    active_goal.achieved_at = datetime.now(timezone.utc)
            if tx.shake_details:
                tx.shake_details.goal_id = active_goal.id
            else:
                self.session.add(
                    ShakeDetails(
                        transaction_id=tx.id,
                        shakes_count=shakes_count,
                        supporter_message=supporter_message,
                        is_anonymous=is_anonymous,
                        goal_id=active_goal.id,
                    )
                )

        tx.status_code = 302
        if payment_intent_id:
            tx.stripe_payment_intent_id = payment_intent_id
        elif tx.stripe_payment_intent_id and str(tx.stripe_payment_intent_id).startswith("cs_"):
            # Ya no necesitamos el session id provisional
            tx.stripe_payment_intent_id = None

        athlete_stmt = (
            select(AthleteProfile)
            .options(*_athlete_stripe_load_options())
            .where(AthleteProfile.id == tx.athlete_id)
        )
        athlete_res = await self.session.execute(athlete_stmt)
        athlete = athlete_res.scalar_one_or_none()

        supporter_display = "Alguien anónimo" if is_anonymous else (tx.supporter_name or "Un Supporter")
        if athlete and athlete.user_id:
            notif = Notification(
                user_id=athlete.user_id,
                title=f"¡Recibiste {shakes_count} Shakes!",
                message=f"{supporter_display} te apoyó con {shakes_count} Shakes (${tx.gross_amount} USD).",
                type_code=401,
                action_url="/dashboard/supporters",
            )
            self.session.add(notif)

        await self.session.flush()
        logger.info(
            "Transaccion %s confirmada via %s (goal=%s raised=%s)",
            tx_uuid,
            source,
            active_goal.id if active_goal else None,
            float(active_goal.raised_amount) if active_goal else None,
        )

        return {
            "handled": True,
            "transaction_uuid": tx_uuid,
            "goal_updated": active_goal.id if active_goal else None,
            "new_goal_raised": float(active_goal.raised_amount) if active_goal else None,
            "thank_you_message": get_thank_you(athlete) if athlete else None,
            "supporter_item": self._supporter_item_payload(
                tx_id=tx.id,
                supporter_name=tx.supporter_name,
                shakes_count=shakes_count,
                gross_amount=tx.gross_amount,
                supporter_message=supporter_message,
                is_anonymous=is_anonymous,
            ),
            "status": "succeeded",
            "source": source,
        }

    # ==========================================================================
    # 1.1 SUSCRIPCIONES Y TIERS (MEMBRESÍAS RECURRENTES)
    # ==========================================================================

    async def create_stripe_tier_price(
        self,
        athlete: AthleteProfile,
        tier_name: str,
        monthly_price: Decimal,
        currency: str = "USD",
    ) -> str | None:
        """Crea un Product y Price recurrente en Stripe para el nivel de membresía."""
        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return f"price_mock_{secrets.token_hex(8)}"

        try:
            product = stripe.Product.create(
                name=f"{tier_name} — @{athlete.handle}",
                description=f"Membresía mensual con @{athlete.handle} en buymeashake.fit",
                metadata={
                    "athlete_id": str(athlete.id),
                    "athlete_handle": athlete.handle,
                    "tier_name": tier_name,
                },
            )

            unit_amount_cents = int((monthly_price * 100).to_integral_value())
            price = stripe.Price.create(
                product=product.id,
                unit_amount=unit_amount_cents,
                currency=currency.lower(),
                recurring={"interval": "month"},
                metadata={
                    "athlete_id": str(athlete.id),
                    "tier_name": tier_name,
                },
            )
            return price.id
        except Exception as e:
            logger.error("Error al crear producto/precio recurrente en Stripe: %s", str(e))
            return None

    async def create_subscription_checkout_session(
        self,
        athlete: AthleteProfile,
        tier: Any,
        supporter_user: User | None = None,
        supporter_email: str | None = None,
        supporter_name: str | None = None,
    ) -> dict[str, str]:
        """Crea una sesión de Checkout de Stripe en modo subscription para un Tier."""
        tx_uuid = secrets.token_hex(16)
        email = (supporter_user.email if supporter_user else supporter_email) or ""
        name = (supporter_user.full_name if supporter_user else supporter_name) or "Fan"

        customer_id = await self._get_or_create_customer(email, name, supporter_user)

        success_url = f"{settings.FRONTEND_URL}/{athlete.handle}?membership=success&tx={tx_uuid}&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{settings.FRONTEND_URL}/{athlete.handle}?membership=cancelled"

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return {
                "checkout_url": success_url,
                "session_id": f"cs_sub_mock_{tx_uuid}",
                "transaction_uuid": tx_uuid,
            }

        price_id = tier.stripe_price_id
        if not price_id:
            # Si no tenía price_id, generarlo sobre la marcha
            price_id = await self.create_stripe_tier_price(
                athlete=athlete,
                tier_name=tier.name,
                monthly_price=tier.monthly_price,
                currency=tier.currency,
            )
            if price_id:
                tier.stripe_price_id = price_id
                await self.session.flush()

        if not price_id:
            raise BusinessLogicError("No se pudo configurar el precio de la suscripción en Stripe.")

        session_params: dict[str, Any] = {
            "payment_method_types": ["card"],
            "line_items": [
                {
                    "price": price_id,
                    "quantity": 1,
                }
            ],
            "mode": "subscription",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": tx_uuid,
            "subscription_data": {
                "application_fee_percent": float(settings.PLATFORM_FEE_PERCENTAGE) * 100,  # ej. 5.0%
                "metadata": {
                    "transaction_uuid": tx_uuid,
                    "tier_id": str(tier.id),
                    "athlete_id": str(athlete.id),
                    "supporter_user_id": str(supporter_user.id) if supporter_user else "",
                    "kind": "tier_subscription",
                },
            },
            "metadata": {
                "transaction_uuid": tx_uuid,
                "tier_id": str(tier.id),
                "athlete_id": str(athlete.id),
                "supporter_user_id": str(supporter_user.id) if supporter_user else "",
                "kind": "tier_subscription",
            },
        }

        # Si el atleta tiene cuenta Connect habilitada, destinar la suscripción a su cuenta
        payouts = athlete.payouts
        if payouts and payouts.stripe_connect_account_id and payouts.payouts_enabled:
            session_params["subscription_data"]["transfer_data"] = {
                "destination": payouts.stripe_connect_account_id,
            }

        if customer_id:
            session_params["customer"] = customer_id
        elif email:
            session_params["customer_email"] = email

        checkout_session = stripe.checkout.Session.create(**session_params)

        return {
            "checkout_url": checkout_session.url or "",
            "session_id": checkout_session.id,
            "transaction_uuid": tx_uuid,
        }

    async def create_customer_portal_session(self, user: User, return_url: str | None = None) -> str:
        """Genera enlace al Customer Portal de Stripe para gestionar/cancelar suscripciones."""
        customer_id = user.stripe_customer_id
        if not customer_id:
            raise BusinessLogicError("El usuario aún no tiene un perfil de pagos registrado en Stripe.")

        ret_url = return_url or f"{settings.FRONTEND_URL}/explore"

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return f"{ret_url}?portal=mock_success"

        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=ret_url,
        )
        return portal_session.url


    # ==========================================================================
    # 2. STRIPE CONNECT EXPRESS (ONBOARDING & RETIROS)
    # ==========================================================================

    async def create_or_get_connect_account(
        self, athlete: AthleteProfile, country_code: str | None = None
    ) -> str:
        """Crea una cuenta Express en Stripe Connect o devuelve la existente para MX o US."""
        payouts = ensure_payouts(self.session, athlete)
        if payouts.stripe_connect_account_id:
            return payouts.stripe_connect_account_id

        target_country = (country_code or payouts.country_code or "MX").upper()
        if target_country not in ("MX", "US"):
            target_country = "MX"
        payouts.country_code = target_country

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            mock_acct = f"acct_mock_{target_country}_{athlete.id}"
            payouts.stripe_connect_account_id = mock_acct
            await self.session.flush()
            return mock_acct

        user = athlete.user
        account_params: dict[str, Any] = {
            "type": "express",
            "country": target_country,
            "business_type": "individual",
            "capabilities": {
                "transfers": {"requested": True},
            },
            "business_profile": {
                "url": f"{settings.STRIPE_CONNECT_BUSINESS_URL}/@{athlete.handle}",
                "product_description": f"Entrenamiento y preparación deportiva de {user.full_name}",
            },
            "metadata": {
                "athlete_id": str(athlete.id),
                "athlete_handle": athlete.handle,
                "user_id": str(user.id),
            },
        }

        if user.email:
            account_params["email"] = user.email

        # Separar nombre y apellido para precargar
        parts = (user.full_name or "").strip().split(maxsplit=1)
        first_name = parts[0] if len(parts) > 0 else "Atleta"
        last_name = parts[1] if len(parts) > 1 else "Deportivo"

        account_params["individual"] = {
            "first_name": first_name,
            "last_name": last_name,
            "email": user.email,
        }

        account = stripe.Account.create(**account_params)
        payouts.stripe_connect_account_id = account.id
        await self.session.flush()
        return account.id

    async def generate_connect_onboarding_link(
        self, athlete: AthleteProfile, country_code: str | None = None
    ) -> dict[str, str]:
        """Crea el enlace de Stripe AccountLink para onboarding Express (MX o US)."""
        account_id = await self.create_or_get_connect_account(athlete, country_code=country_code)

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return {
                "account_link_url": f"{settings.STRIPE_CONNECT_RETURN_URL}&mock_success=true",
                "stripe_connect_account_id": account_id,
            }

        link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=settings.STRIPE_CONNECT_REFRESH_URL,
            return_url=settings.STRIPE_CONNECT_RETURN_URL,
            type="account_onboarding",
        )

        return {
            "account_link_url": link.url,
            "stripe_connect_account_id": account_id,
        }

    async def get_connect_account_status(self, athlete: AthleteProfile) -> dict[str, Any]:
        """Verifica en tiempo real con Stripe si el atleta completó sus datos bancarios."""
        payouts = ensure_payouts(self.session, athlete)
        account_id = payouts.stripe_connect_account_id
        if not account_id:
            return {
                "stripe_connect_account_id": None,
                "payouts_enabled": False,
                "details_submitted": False,
                "charges_enabled": False,
                "requirements_due": [],
            }

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return {
                "stripe_connect_account_id": account_id,
                "payouts_enabled": payouts.payouts_enabled,
                "details_submitted": payouts.payouts_enabled,
                "charges_enabled": payouts.payouts_enabled,
                "requirements_due": [],
            }

        try:
            account = stripe.Account.retrieve(account_id)
            payouts_enabled = bool(account.payouts_enabled)
            details_submitted = bool(account.details_submitted)
            charges_enabled = bool(account.charges_enabled)

            requirements_due: list[str] = []
            if account.requirements and account.requirements.currently_due:
                requirements_due = list(account.requirements.currently_due)

            # Sincronizar en nuestra BD
            if payouts.payouts_enabled != payouts_enabled:
                payouts.payouts_enabled = payouts_enabled
                await self.session.flush()

            return {
                "stripe_connect_account_id": account_id,
                "payouts_enabled": payouts_enabled,
                "details_submitted": details_submitted,
                "charges_enabled": charges_enabled,
                "requirements_due": requirements_due,
            }
        except Exception as e:
            logger.error("Error al consultar cuenta Connect en Stripe: %s", str(e))
            return {
                "stripe_connect_account_id": account_id,
                "payouts_enabled": payouts.payouts_enabled,
                "details_submitted": False,
                "charges_enabled": False,
                "requirements_due": [],
            }

    # ==========================================================================
    # 3. DISPERSIÓN (TRANSFER / RETIROS DE BALANCE)
    # ==========================================================================

    async def transfer_funds_to_athlete(self, athlete: AthleteProfile, amount_usd: Decimal, withdrawal_id: int) -> str:
        """Transfiere fondos desde la plataforma hacia la cuenta Connect del atleta (con idempotencia)."""
        payouts = athlete.payouts
        if not payouts or not payouts.stripe_connect_account_id or not payouts.payouts_enabled:
            raise BusinessLogicError("El atleta no tiene su cuenta de Stripe Connect activa para recibir pagos.")

        amount_cents = int((amount_usd * 100).to_integral_value())

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return f"tr_mock_{withdrawal_id}"

        try:
            transfer = stripe.Transfer.create(
                amount=amount_cents,
                currency="usd",
                destination=payouts.stripe_connect_account_id,
                description=f"Retiro de fondos #{withdrawal_id} para @{athlete.handle}",
                idempotency_key=f"withdrawal_{withdrawal_id}",
            )
            return transfer.id
        except stripe.error.InvalidRequestError as err:
            # En entorno de prueba (test keys), si Stripe no tiene saldo líquido por ciclo bancario de MX
            if "insufficient available funds" in str(err).lower() and settings.STRIPE_SECRET_KEY.startswith("sk_test_"):
                logger.warning(
                    "[STRIPE TEST MODE FALLBACK] Fondos insuficientes en Stripe sandbox (%s). "
                    "Generando ID de transferencia simulada para permitir probar el flujo contable completo.",
                    str(err)
                )
                return f"tr_test_{withdrawal_id}_{payouts.stripe_connect_account_id[:12]}"
            raise

    # ==========================================================================
    # 3.5 VERIFICACIÓN DIRECTA DE SESIÓN (CALLBACK DE RETORNO EN LOCAL / CLIENTE)
    # ==========================================================================

    async def verify_and_process_session(
        self,
        session_id: str,
        tx_uuid: str | None = None,
    ) -> dict[str, Any]:
        """Confirma el pago al volver de Stripe y suma al goal.

        Si el cliente manda `tx` (success_url), se confirma la pendiente salvo que
        Stripe diga explícitamente que NO está pagada.
        """
        is_mock = bool(
            session_id
            and (session_id.startswith("cs_mock_") or session_id.startswith("cs_sub_mock_"))
        )
        is_placeholder = (
            not settings.STRIPE_SECRET_KEY
            or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder")
        )

        if is_mock or is_placeholder:
            if tx_uuid:
                return await self.fulfill_pending_shake(
                    tx_uuid,
                    source="mock_session" if is_mock else "placeholder_key",
                )
            return {"handled": True, "status": "mock_session" if is_mock else "placeholder_key"}

        payment_intent_id: str | None = None
        session_dict: dict[str, Any] | None = None
        checkout_mode: str | None = None
        stripe_error: str | None = None

        if session_id:
            try:
                checkout_session = stripe.checkout.Session.retrieve(session_id)
                checkout_mode = checkout_session.mode
                session_dict = _stripe_obj_to_dict(checkout_session)
                payment_intent_id = _stripe_resource_id(checkout_session.payment_intent)

                if checkout_session.payment_status not in ("paid", "no_payment_required"):
                    logger.info(
                        "Sesión %s con estado de pago: %s",
                        session_id,
                        checkout_session.payment_status,
                    )
                    return {
                        "handled": False,
                        "reason": "not_paid",
                        "payment_status": checkout_session.payment_status,
                    }
            except Exception as e:
                stripe_error = str(e)
                await self.session.rollback()
                logger.error(
                    "Error al verificar sesión de Stripe %s: %s",
                    session_id,
                    stripe_error,
                    exc_info=True,
                )
                # Si no hay tx local, no podemos confirmar a ciegas
                if not tx_uuid:
                    return {"handled": False, "error": stripe_error}

        resolved_tx = tx_uuid
        if not resolved_tx and session_dict:
            metadata = session_dict.get("metadata") or {}
            if not isinstance(metadata, dict):
                metadata = _stripe_obj_to_dict(metadata)
            resolved_tx = metadata.get("transaction_uuid") or session_dict.get("client_reference_id")

        if checkout_mode == "subscription" and session_dict and not stripe_error:
            return await self._process_subscription_completed(session_dict)

        # Camino principal: confirmar pendiente creada al abrir Checkout
        if resolved_tx:
            result = await self.fulfill_pending_shake(
                resolved_tx,
                payment_intent_id=payment_intent_id,
                source="client_return_tx" if tx_uuid else "stripe_metadata_tx",
            )
            if result.get("handled"):
                logger.info("Resultado verify_and_process_session (%s): %s", session_id, result)
                return result

            # No había pendiente: crear desde metadata (legacy)
            if session_dict and not stripe_error:
                created = await self._process_successful_payment(
                    session_dict,
                    "checkout.session.completed",
                )
                logger.info("Resultado verify (legacy create) (%s): %s", session_id, created)
                return created
            return result

        if session_dict and not stripe_error:
            return await self._process_successful_payment(session_dict, "checkout.session.completed")

        return {
            "handled": False,
            "error": stripe_error or "missing_session_and_tx",
        }

    # ==========================================================================
    # 4. WEBHOOK IDEMPOTENTE: CONFIRMACIÓN Y ACTUALIZACIÓN DE METAS (GOALS)
    # ==========================================================================

    async def handle_stripe_event(self, event: dict[str, Any]) -> dict[str, Any]:
        """Procesa de forma idempotente eventos verificados de Stripe."""
        event_type = event.get("type")
        data_object = event.get("data", {}).get("object", {})

        if event_type in ("checkout.session.completed", "payment_intent.succeeded"):
            # Si la sesión completada es una suscripción
            if event_type == "checkout.session.completed" and data_object.get("mode") == "subscription":
                return await self._process_subscription_completed(data_object)
            return await self._process_successful_payment(data_object, event_type)

        if event_type == "invoice.payment_succeeded":
            return await self._process_invoice_payment_succeeded(data_object)

        if event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
            return await self._process_subscription_updated_or_deleted(data_object, event_type)

        if event_type == "account.updated":
            return await self._process_account_updated(data_object)

        return {"handled": True, "event_type": event_type, "status": "ignored"}

    def _supporter_item_payload(
        self,
        *,
        tx_id: int | None,
        supporter_name: str | None,
        shakes_count: int,
        gross_amount: Decimal,
        supporter_message: str | None,
        is_anonymous: bool,
    ) -> dict[str, Any]:
        display = "Alguien anónimo" if is_anonymous else (supporter_name or "Un Supporter")
        return {
            "id": tx_id or 0,
            "supporter_name": display,
            "shakes_count": shakes_count,
            "gross_amount": float(gross_amount),
            "currency": "USD",
            "supporter_message": supporter_message,
            "is_anonymous": is_anonymous,
            "created_at": "",
        }

    async def _process_successful_payment(self, obj: dict[str, Any], event_type: str) -> dict[str, Any]:
        """Crea la transacción, suma a la Meta del Atleta y envía emails/notificaciones."""
        metadata = obj.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = _stripe_obj_to_dict(metadata)

        tx_uuid = metadata.get("transaction_uuid") or obj.get("client_reference_id")

        if not tx_uuid:
            logger.info("Evento %s sin transaction_uuid en metadata. Se ignora.", event_type)
            return {"handled": True, "reason": "no_tx_uuid"}

        # Verificar si ya existe (pendiente o completada)
        existing_stmt = (
            select(Transaction)
            .options(selectinload(Transaction.shake_details))
            .where(Transaction.transaction_uuid == tx_uuid)
        )
        res = await self.session.execute(existing_stmt)
        existing_tx = res.scalar_one_or_none()
        if existing_tx:
            if event_type == "checkout.session.completed":
                payment_intent_id = _stripe_resource_id(obj.get("payment_intent"))
            else:
                payment_intent_id = _stripe_resource_id(obj.get("id"))
            return await self.fulfill_pending_shake(
                tx_uuid,
                payment_intent_id=payment_intent_id,
                source=event_type,
            )

        athlete_id = int(metadata.get("athlete_id") or 0)
        athlete_stmt = (
            select(AthleteProfile)
            .options(*_athlete_stripe_load_options())
            .where(AthleteProfile.id == athlete_id)
        )
        athlete_res = await self.session.execute(athlete_stmt)
        athlete = athlete_res.scalar_one_or_none()
        if not athlete:
            logger.warning("Atleta con ID %s no encontrado para transacción %s.", athlete_id, tx_uuid)
            return {"handled": False, "error": "athlete_not_found"}

        shakes_count = int(metadata.get("shakes_count") or 1)
        supporter_name = metadata.get("supporter_name") or None
        customer_details = obj.get("customer_details") or {}
        if not isinstance(customer_details, dict):
            customer_details = _stripe_obj_to_dict(customer_details)
        supporter_email = (
            metadata.get("supporter_email")
            or customer_details.get("email")
            or obj.get("customer_email")
            or None
        )
        supporter_message = metadata.get("supporter_message") or None
        is_anonymous = metadata.get("is_anonymous") == "true"
        supporter_user_id = int(metadata["supporter_user_id"]) if metadata.get("supporter_user_id") else None

        # Montos
        unit_price = get_shake_price(athlete)
        gross_amount = unit_price * Decimal(shakes_count)
        platform_fee = (gross_amount * Decimal(str(settings.PLATFORM_FEE_PERCENTAGE))).quantize(Decimal("0.01"))
        stripe_fee = Decimal("0.30") + (gross_amount * Decimal("0.029")).quantize(Decimal("0.01"))
        net_athlete = gross_amount - platform_fee - stripe_fee

        # ----------------------------------------------------------------------
        # ACTUALIZACIÓN EN TIEMPO REAL DE LA META (GOAL)
        # ----------------------------------------------------------------------
        goal_id_raw = metadata.get("goal_id") or ""
        active_goal = None
        if str(goal_id_raw).isdigit():
            goal_stmt = select(Goal).where(Goal.id == int(goal_id_raw))
            goal_res = await self.session.execute(goal_stmt)
            active_goal = goal_res.scalar_one_or_none()

        if not active_goal:
            # Buscar la meta activa si no venía en metadata
            active_goal = next((g for g in athlete.goals if g.is_active), None)

        if active_goal:
            active_goal.raised_amount = (active_goal.raised_amount or Decimal("0.00")) + gross_amount
            # Verificar si se alcanzó la meta
            if active_goal.target_amount and active_goal.raised_amount >= active_goal.target_amount:
                if not active_goal.achieved_at:
                    from datetime import datetime, timezone
                    active_goal.achieved_at = datetime.now(timezone.utc)

        if event_type == "checkout.session.completed":
            payment_intent_id = _stripe_resource_id(obj.get("payment_intent"))
        else:
            payment_intent_id = _stripe_resource_id(obj.get("id"))

        tx = Transaction(
            transaction_uuid=tx_uuid,
            supporter_id=supporter_user_id,
            supporter_name=supporter_name.strip() if supporter_name else None,
            supporter_email=supporter_email.strip() if isinstance(supporter_email, str) and supporter_email else None,
            athlete_id=athlete.id,
            transaction_type_code=201,  # Shake
            gross_amount=gross_amount,
            currency="USD",
            platform_fee=platform_fee,
            stripe_fee=stripe_fee,
            net_athlete_amount=net_athlete,
            stripe_payment_intent_id=payment_intent_id,
            status_code=302,  # Succeeded / Aprobado
        )
        self.session.add(tx)
        await self.session.flush()

        self.session.add(
            ShakeDetails(
                transaction_id=tx.id,
                shakes_count=shakes_count,
                supporter_message=supporter_message,
                is_anonymous=is_anonymous,
                goal_id=active_goal.id if active_goal else None,
            )
        )

        # Crear notificación para el atleta
        supporter_display = "Alguien anónimo" if is_anonymous else (supporter_name or "Un Supporter")
        if athlete.user_id:
            notif = Notification(
                user_id=athlete.user_id,
                title=f"¡Recibiste {shakes_count} Shakes!",
                message=f"{supporter_display} te apoyó con {shakes_count} Shakes (${gross_amount} USD).",
                type_code=401,
                action_url="/dashboard/supporters",
            )
            self.session.add(notif)

        await self.session.flush()

        # Enviar email de agradecimiento en segundo plano
        if supporter_email:
            try:
                from app.services.email_service import EmailService
                email_svc = EmailService()
                await email_svc.send_thank_you_donation_email(
                    recipient_email=supporter_email,
                    supporter_name=supporter_name or "Fan del Deporte",
                    athlete_name=athlete.user.full_name,
                    shakes_count=shakes_count,
                    gross_amount=float(gross_amount),
                    thank_you_message=get_thank_you(athlete),
                    athlete_handle=athlete.handle,
                )
            except Exception as e:
                logger.error("Error al enviar email de agradecimiento tras pago: %s", str(e))

        return {
            "handled": True,
            "transaction_uuid": tx_uuid,
            "goal_updated": active_goal.id if active_goal else None,
            "new_goal_raised": float(active_goal.raised_amount) if active_goal else None,
            "thank_you_message": get_thank_you(athlete),
            "supporter_item": self._supporter_item_payload(
                tx_id=tx.id,
                supporter_name=supporter_name,
                shakes_count=shakes_count,
                gross_amount=gross_amount,
                supporter_message=supporter_message,
                is_anonymous=is_anonymous,
            ),
            "status": "succeeded",
        }

    async def _process_account_updated(self, obj: dict[str, Any]) -> dict[str, Any]:
        """Sincroniza el estado de la cuenta Connect tras cambios en Stripe."""
        account_id = obj.get("id")
        if not account_id:
            return {"handled": False}

        stmt = (
            select(AthleteProfile)
            .join(AthletePayouts)
            .options(selectinload(AthleteProfile.payouts))
            .where(AthletePayouts.stripe_connect_account_id == account_id)
        )
        res = await self.session.execute(stmt)
        athlete = res.scalar_one_or_none()
        if athlete:
            payouts = ensure_payouts(self.session, athlete)
            payouts.payouts_enabled = bool(obj.get("payouts_enabled", False))
            await self.session.flush()

        return {"handled": True, "account_id": account_id}

    async def _process_subscription_completed(self, session_obj: dict[str, Any]) -> dict[str, Any]:
        """Procesa una sesión de Stripe Checkout completada en modo subscription."""
        metadata = session_obj.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = _stripe_obj_to_dict(metadata)
        tx_uuid = metadata.get("transaction_uuid") or session_obj.get("client_reference_id")
        stripe_sub_id = _stripe_resource_id(session_obj.get("subscription"))

        if not stripe_sub_id:
            logger.warning("checkout.session.completed en modo subscription sin subscription ID.")
            return {"handled": False, "reason": "missing_subscription_id"}

        tier_id_raw = metadata.get("tier_id")
        if not tier_id_raw or not tier_id_raw.isdigit():
            logger.warning("Sesión de suscripción sin tier_id válido: %s", tier_id_raw)
            return {"handled": False, "reason": "invalid_tier_id"}

        tier_id = int(tier_id_raw)
        supporter_user_id = int(metadata["supporter_user_id"]) if metadata.get("supporter_user_id") else None

        # Si no había supporter_user_id directo, buscar por email o customer_id
        if not supporter_user_id:
            customer_id = session_obj.get("customer")
            email = session_obj.get("customer_details", {}).get("email")
            if customer_id:
                user_stmt = select(User).where(User.stripe_customer_id == customer_id)
                u_res = await self.session.execute(user_stmt)
                matched_user = u_res.scalar_one_or_none()
                if matched_user:
                    supporter_user_id = matched_user.id
            if not supporter_user_id and email:
                user_stmt = select(User).where(User.email == email)
                u_res = await self.session.execute(user_stmt)
                matched_user = u_res.scalar_one_or_none()
                if matched_user:
                    supporter_user_id = matched_user.id

        if not supporter_user_id:
            logger.warning("No se pudo vincular la suscripción a un User existente.")
            return {"handled": False, "reason": "user_not_found"}

        # Verificar si la suscripción ya existe (idempotente)
        sub_stmt = select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        sub_res = await self.session.execute(sub_stmt)
        existing_sub = sub_res.scalar_one_or_none()

        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=31)

        if not existing_sub:
            new_sub = Subscription(
                user_id=supporter_user_id,
                tier_id=tier_id,
                stripe_subscription_id=stripe_sub_id,
                status="active",
                current_period_start=now,
                current_period_end=period_end,
            )
            self.session.add(new_sub)
        else:
            existing_sub.status = "active"
            existing_sub.current_period_start = now
            existing_sub.current_period_end = period_end

        # Notificar al atleta
        athlete_id = int(metadata.get("athlete_id", 0))
        if athlete_id:
            athlete_stmt = (
                select(AthleteProfile)
                .options(selectinload(AthleteProfile.user))
                .where(AthleteProfile.id == athlete_id)
            )
            a_res = await self.session.execute(athlete_stmt)
            athlete = a_res.scalar_one_or_none()
            if athlete and athlete.user_id:
                notif = Notification(
                    user_id=athlete.user_id,
                    title="¡Nuevo Miembro en tu Comunidad! ⭐️",
                    message="Un seguidor se acaba de suscribir a tu nivel de membresía.",
                    type_code=402,
                    action_url="/dashboard/memberships",
                )
                self.session.add(notif)

        await self.session.flush()
        return {"handled": True, "subscription_id": stripe_sub_id, "status": "active"}

    async def _process_invoice_payment_succeeded(self, invoice_obj: dict[str, Any]) -> dict[str, Any]:
        """Renueva el periodo de la suscripción tras el cobro recurrente mensual."""
        stripe_sub_id = invoice_obj.get("subscription")
        if not stripe_sub_id:
            return {"handled": True, "reason": "no_subscription_in_invoice"}

        stmt = select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        res = await self.session.execute(stmt)
        sub = res.scalar_one_or_none()
        if not sub:
            logger.info("Suscripción %s no encontrada en BD para renovación.", stripe_sub_id)
            return {"handled": False, "reason": "subscription_not_found"}

        lines = invoice_obj.get("lines", {}).get("data", [])
        from datetime import datetime, timezone, timedelta
        if lines and "period" in lines[0]:
            period = lines[0]["period"]
            sub.current_period_start = datetime.fromtimestamp(period.get("start", 0), timezone.utc)
            sub.current_period_end = datetime.fromtimestamp(period.get("end", 0), timezone.utc)
        else:
            now = datetime.now(timezone.utc)
            sub.current_period_end = now + timedelta(days=31)

        sub.status = "active"
        await self.session.flush()
        return {"handled": True, "subscription_id": stripe_sub_id, "action": "renewed"}

    async def _process_subscription_updated_or_deleted(self, sub_obj: dict[str, Any], event_type: str) -> dict[str, Any]:
        """Actualiza el estado o cancela la suscripción cuando cambia en Stripe."""
        stripe_sub_id = sub_obj.get("id")
        if not stripe_sub_id:
            return {"handled": False}

        stmt = select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
        res = await self.session.execute(stmt)
        sub = res.scalar_one_or_none()
        if not sub:
            return {"handled": False, "reason": "subscription_not_found"}

        stripe_status = sub_obj.get("status", "canceled")
        from datetime import datetime, timezone
        if event_type == "customer.subscription.deleted" or stripe_status in ("canceled", "unpaid"):
            sub.status = "canceled"
            sub.canceled_at = datetime.now(timezone.utc)
        elif stripe_status == "past_due":
            sub.status = "past_due"
        elif stripe_status == "active":
            sub.status = "active"

        await self.session.flush()
        return {"handled": True, "subscription_id": stripe_sub_id, "new_status": sub.status}
