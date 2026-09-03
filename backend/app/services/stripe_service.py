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
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BusinessLogicError, EntityNotFoundError
from app.models.entities import AthleteProfile, Goal, Notification, Transaction, User

logger = logging.getLogger(__name__)

# Configurar API Key global de Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


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
        unit_price = athlete.shake_price
        gross_amount = unit_price * Decimal(shakes_count)
        unit_amount_cents = int((unit_price * 100).to_integral_value())

        # Buscar meta activa del atleta
        active_goal = next((g for g in athlete.goals if g.is_active), None)
        goal_id = str(active_goal.id) if active_goal else ""

        tx_uuid = secrets.token_hex(16)
        customer_id = await self._get_or_create_customer(supporter_email, supporter_name, supporter_user)

        success_url = f"{settings.FRONTEND_URL}/@{athlete.handle}?payment=success&tx={tx_uuid}"
        cancel_url = f"{settings.FRONTEND_URL}/@{athlete.handle}?payment=cancelled"

        # Si estamos en modo placeholder (aún sin keys válidas), devolvemos URL mock
        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return {
                "checkout_url": success_url,
                "session_id": f"cs_mock_{tx_uuid}",
                "transaction_uuid": tx_uuid,
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
            "metadata": {
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
            },
        }

        if customer_id:
            session_params["customer"] = customer_id
        elif supporter_email:
            session_params["customer_email"] = supporter_email

        checkout_session = stripe.checkout.Session.create(**session_params)

        return {
            "checkout_url": checkout_session.url or "",
            "session_id": checkout_session.id,
            "transaction_uuid": tx_uuid,
        }

    # ==========================================================================
    # 2. STRIPE CONNECT EXPRESS (ONBOARDING & RETIROS)
    # ==========================================================================

    async def create_or_get_connect_account(self, athlete: AthleteProfile) -> str:
        """Crea una cuenta Express en Stripe Connect o devuelve la existente."""
        if athlete.stripe_connect_account_id:
            return athlete.stripe_connect_account_id

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            mock_acct = f"acct_mock_{athlete.id}"
            athlete.stripe_connect_account_id = mock_acct
            await self.session.flush()
            return mock_acct

        user = athlete.user
        account_params: dict[str, Any] = {
            "type": "express",
            "country": "MX",  # Por defecto MX (o configurable por atleta)
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
        athlete.stripe_connect_account_id = account.id
        await self.session.flush()
        return account.id

    async def generate_connect_onboarding_link(self, athlete: AthleteProfile) -> dict[str, str]:
        """Crea el enlace de Stripe AccountLink para onboarding Express."""
        account_id = await self.create_or_get_connect_account(athlete)

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
        account_id = athlete.stripe_connect_account_id
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
                "payouts_enabled": athlete.payouts_enabled,
                "details_submitted": athlete.payouts_enabled,
                "charges_enabled": athlete.payouts_enabled,
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
            if athlete.payouts_enabled != payouts_enabled:
                athlete.payouts_enabled = payouts_enabled
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
                "payouts_enabled": athlete.payouts_enabled,
                "details_submitted": False,
                "charges_enabled": False,
                "requirements_due": [],
            }

    # ==========================================================================
    # 3. DISPERSIÓN (TRANSFER / RETIROS DE BALANCE)
    # ==========================================================================

    async def transfer_funds_to_athlete(self, athlete: AthleteProfile, amount_usd: Decimal, withdrawal_id: int) -> str:
        """Transfiere fondos desde la plataforma hacia la cuenta Connect del atleta (con idempotencia)."""
        if not athlete.stripe_connect_account_id or not athlete.payouts_enabled:
            raise BusinessLogicError("El atleta no tiene su cuenta de Stripe Connect activa para recibir pagos.")

        amount_cents = int((amount_usd * 100).to_integral_value())

        if not settings.STRIPE_SECRET_KEY or settings.STRIPE_SECRET_KEY.startswith("sk_test_placeholder"):
            return f"tr_mock_{withdrawal_id}"

        transfer = stripe.Transfer.create(
            amount=amount_cents,
            currency="usd",
            destination=athlete.stripe_connect_account_id,
            description=f"Retiro de fondos #{withdrawal_id} para @{athlete.handle}",
            idempotency_key=f"withdrawal_{withdrawal_id}",
        )
        return transfer.id

    # ==========================================================================
    # 4. WEBHOOK IDEMPOTENTE: CONFIRMACIÓN Y ACTUALIZACIÓN DE METAS (GOALS)
    # ==========================================================================

    async def handle_stripe_event(self, event: dict[str, Any]) -> dict[str, Any]:
        """Procesa de forma idempotente eventos verificados de Stripe."""
        event_type = event.get("type")
        data_object = event.get("data", {}).get("object", {})

        if event_type in ("checkout.session.completed", "payment_intent.succeeded"):
            return await self._process_successful_payment(data_object, event_type)

        if event_type == "account.updated":
            return await self._process_account_updated(data_object)

        return {"handled": True, "event_type": event_type, "status": "ignored"}

    async def _process_successful_payment(self, obj: dict[str, Any], event_type: str) -> dict[str, Any]:
        """Crea la transacción, suma a la Meta del Atleta y envía emails/notificaciones."""
        metadata = obj.get("metadata", {})
        tx_uuid = metadata.get("transaction_uuid") or obj.get("client_reference_id")

        if not tx_uuid:
            logger.info("Evento %s sin transaction_uuid en metadata. Se ignora.", event_type)
            return {"handled": True, "reason": "no_tx_uuid"}

        # Verificar si ya fue procesada (Idempotencia)
        existing_stmt = select(Transaction).where(Transaction.transaction_uuid == tx_uuid)
        res = await self.session.execute(existing_stmt)
        if res.scalar_one_or_none():
            logger.info("Transacción %s ya procesada previamente (idempotente).", tx_uuid)
            return {"handled": True, "status": "already_processed"}

        athlete_id = int(metadata.get("athlete_id", 0))
        athlete_stmt = select(AthleteProfile).where(AthleteProfile.id == athlete_id)
        athlete_res = await self.session.execute(athlete_stmt)
        athlete = athlete_res.scalar_one_or_none()
        if not athlete:
            logger.warning("Atleta con ID %s no encontrado para transacción %s.", athlete_id, tx_uuid)
            return {"handled": False, "error": "athlete_not_found"}

        shakes_count = int(metadata.get("shakes_count", 1))
        supporter_name = metadata.get("supporter_name") or None
        supporter_email = metadata.get("supporter_email") or obj.get("customer_details", {}).get("email") or None
        supporter_message = metadata.get("supporter_message") or None
        is_anonymous = metadata.get("is_anonymous") == "true"
        supporter_user_id = int(metadata["supporter_user_id"]) if metadata.get("supporter_user_id") else None

        # Montos
        unit_price = athlete.shake_price
        gross_amount = unit_price * Decimal(shakes_count)
        platform_fee = (gross_amount * Decimal(str(settings.PLATFORM_FEE_PERCENTAGE))).quantize(Decimal("0.01"))
        stripe_fee = Decimal("0.30") + (gross_amount * Decimal("0.029")).quantize(Decimal("0.01"))
        net_athlete = gross_amount - platform_fee - stripe_fee

        # ----------------------------------------------------------------------
        # ACTUALIZACIÓN EN TIEMPO REAL DE LA META (GOAL)
        # ----------------------------------------------------------------------
        goal_id_raw = metadata.get("goal_id")
        active_goal = None
        if goal_id_raw and goal_id_raw.isdigit():
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

        payment_intent_id = obj.get("payment_intent") if event_type == "checkout.session.completed" else obj.get("id")

        tx = Transaction(
            transaction_uuid=tx_uuid,
            supporter_id=supporter_user_id,
            supporter_name=supporter_name.strip() if supporter_name else None,
            supporter_email=supporter_email.strip() if supporter_email else None,
            athlete_id=athlete.id,
            goal_id=active_goal.id if active_goal else None,
            transaction_type_code=201,  # Shake
            shakes_count=shakes_count,
            gross_amount=gross_amount,
            currency="USD",
            platform_fee=platform_fee,
            stripe_fee=stripe_fee,
            net_athlete_amount=net_athlete,
            stripe_payment_intent_id=payment_intent_id,
            status_code=302,  # Succeeded / Aprobado
            supporter_message=supporter_message,
            is_anonymous=is_anonymous,
        )
        self.session.add(tx)

        # Crear notificación para el atleta
        supporter_display = "Alguien anónimo" if is_anonymous else (supporter_name or "Un Supporter")
        if athlete.user_id:
            notif = Notification(
                user_id=athlete.user_id,
                title=f"¡Recibiste {shakes_count} Shakes! 🥤",
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
                    thank_you_message=athlete.thank_you_message,
                    athlete_handle=athlete.handle,
                )
            except Exception as e:
                logger.error("Error al enviar email de agradecimiento tras pago: %s", str(e))

        return {
            "handled": True,
            "transaction_uuid": tx_uuid,
            "goal_updated": active_goal.id if active_goal else None,
            "status": "succeeded",
        }

    async def _process_account_updated(self, obj: dict[str, Any]) -> dict[str, Any]:
        """Sincroniza el estado de la cuenta Connect tras cambios en Stripe."""
        account_id = obj.get("id")
        if not account_id:
            return {"handled": False}

        stmt = select(AthleteProfile).where(AthleteProfile.stripe_connect_account_id == account_id)
        res = await self.session.execute(stmt)
        athlete = res.scalar_one_or_none()
        if athlete:
            athlete.payouts_enabled = bool(obj.get("payouts_enabled", False))
            await self.session.flush()

        return {"handled": True, "account_id": account_id}
