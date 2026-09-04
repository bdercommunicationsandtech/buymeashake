from decimal import Decimal
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.dependencies import CurrentAthlete, CurrentUser, DatabaseSession, OptionalUser
from app.core.exceptions import BusinessLogicError, EntityNotFoundError
from app.models.entities import User
from app.repositories.base_repos import WithdrawalRepository
from app.schemas.dtos import (
    AdminWithdrawalActionRequest,
    AthleteBalanceResponse,
    WithdrawalRequestCreate,
    WithdrawalRequestResponse,
)
from app.services.stripe_service import StripeService

router = APIRouter(tags=["Withdrawals"])

MINIMUM_WITHDRAWAL_USD = Decimal("10.00")


# ==============================================================================
# ENDPOINTS ATLETA (/api/v1/athlete/withdrawals)
# ==============================================================================

@router.get("/athlete/withdrawals/balance", response_model=AthleteBalanceResponse)
async def get_my_balance(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> AthleteBalanceResponse:
    """Retorna el balance disponible, total ganado y retirado según la regla contable de BDER."""
    repo = WithdrawalRepository(session)
    balance_data = await repo.get_athlete_balance(athlete.id)
    return AthleteBalanceResponse(**balance_data)


@router.post("/athlete/withdrawals/request", response_model=WithdrawalRequestResponse, status_code=status.HTTP_201_CREATED)
async def request_withdrawal(
    dto: WithdrawalRequestCreate,
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> WithdrawalRequestResponse:
    """Crea una solicitud de retiro en estado 'pending'. NO se llama a Stripe en este paso."""
    if dto.amount_usd < MINIMUM_WITHDRAWAL_USD:
        raise BusinessLogicError(f"El monto mínimo de retiro es de ${MINIMUM_WITHDRAWAL_USD} USD.")

    repo = WithdrawalRepository(session)
    balance_data = await repo.get_athlete_balance(athlete.id)

    if not balance_data["payouts_enabled"]:
        raise BusinessLogicError(
            "Debes completar la configuración de tu cuenta bancaria con Stripe Connect antes de solicitar un retiro."
        )

    if dto.amount_usd > balance_data["available_balance"]:
        raise BusinessLogicError(
            f"Fondos insuficientes. Tu balance disponible es de ${balance_data['available_balance']} USD."
        )

    target_country = dto.destination_country or balance_data.get("destination_country") or "MX"
    req = await repo.create_request(
        athlete_id=athlete.id,
        amount_usd=dto.amount_usd,
        destination_country=target_country,
    )
    await session.commit()
    await session.refresh(req)

    return WithdrawalRequestResponse(
        id=req.id,
        athlete_id=athlete.id,
        athlete_handle=athlete.handle,
        athlete_name=athlete.user.full_name if athlete.user else None,
        amount_usd=req.amount_usd,
        currency=req.currency,
        destination_country=req.destination_country,
        status=req.status,
        stripe_transfer_id=req.stripe_transfer_id,
        failure_reason=req.failure_reason,
        admin_notes=req.admin_notes,
        requested_at=req.requested_at,
        processed_at=req.processed_at,
    )


@router.get("/athlete/withdrawals/history", response_model=list[WithdrawalRequestResponse])
async def get_my_withdrawal_history(
    athlete: CurrentAthlete,
    session: DatabaseSession,
) -> list[WithdrawalRequestResponse]:
    """Lista las solicitudes de retiro del atleta."""
    repo = WithdrawalRepository(session)
    items = await repo.list_by_athlete(athlete.id)
    return [
        WithdrawalRequestResponse(
            id=r.id,
            athlete_id=athlete.id,
            athlete_handle=athlete.handle,
            athlete_name=athlete.user.full_name if athlete.user else None,
            amount_usd=r.amount_usd,
            currency=r.currency,
            destination_country=r.destination_country,
            status=r.status,
            stripe_transfer_id=r.stripe_transfer_id,
            failure_reason=r.failure_reason,
            admin_notes=r.admin_notes,
            requested_at=r.requested_at,
            processed_at=r.processed_at,
        )
        for r in items
    ]


# ==============================================================================
# ENDPOINTS ADMINISTRADOR (/api/v1/admin/withdrawals)
# ==============================================================================

@router.get("/admin/withdrawals", response_model=list[WithdrawalRequestResponse])
async def admin_list_withdrawals(
    user: CurrentUser,
    session: DatabaseSession,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> list[WithdrawalRequestResponse]:
    """Lista solicitudes de retiro para revisión en el panel de administración."""
    repo = WithdrawalRepository(session)
    items = await repo.list_all_admin(status_filter=status_filter)
    return [
        WithdrawalRequestResponse(
            id=r.id,
            athlete_id=r.athlete_id,
            athlete_handle=r.athlete.handle if r.athlete else None,
            athlete_name=r.athlete.user.full_name if r.athlete and r.athlete.user else None,
            amount_usd=r.amount_usd,
            currency=r.currency,
            destination_country=r.destination_country,
            status=r.status,
            stripe_transfer_id=r.stripe_transfer_id,
            failure_reason=r.failure_reason,
            admin_notes=r.admin_notes,
            requested_at=r.requested_at,
            processed_at=r.processed_at,
        )
        for r in items
    ]


@router.post("/admin/withdrawals/{withdrawal_id}/action", response_model=WithdrawalRequestResponse)
async def admin_process_withdrawal(
    withdrawal_id: int,
    dto: AdminWithdrawalActionRequest,
    session: DatabaseSession,
    user: OptionalUser = None,
) -> WithdrawalRequestResponse:
    """Aprueba (stripe.Transfer.create con idempotencia) o rechaza un retiro."""
    from datetime import datetime, timezone
    repo = WithdrawalRepository(session)
    req = await repo.get_by_id(withdrawal_id)
    if not req:
        raise EntityNotFoundError("Solicitud de retiro", withdrawal_id)

    if req.status not in ("pending", "failed"):
        raise BusinessLogicError(f"Esta solicitud ya fue completada exitosamente (estado actual: {req.status}).")

    if dto.action == "reject":
        req.status = "failed"
        req.failure_reason = dto.failure_reason or "Solicitud rechazada por el administrador."
        req.admin_notes = dto.admin_notes
        req.processed_at = datetime.now(timezone.utc)
        req.processed_by_admin_id = user.id if user else None
        await session.commit()
        await session.refresh(req)
    elif dto.action == "approve":
        req.status = "processing"
        await session.flush()

        stripe_svc = StripeService(session)
        try:
            transfer_id = await stripe_svc.transfer_funds_to_athlete(
                athlete=req.athlete,
                amount_usd=req.amount_usd,
                withdrawal_id=req.id,
            )
            req.status = "completed"
            req.stripe_transfer_id = transfer_id
            req.failure_reason = None
            req.admin_notes = dto.admin_notes
            req.processed_at = datetime.now(timezone.utc)
            req.processed_by_admin_id = user.id if user else None
            await session.commit()
            await session.refresh(req)
        except Exception as exc:
            req.status = "failed"
            error_msg = f"Error en transferencia Stripe: {str(exc)}"
            req.failure_reason = error_msg[:250]
            req.admin_notes = dto.admin_notes
            req.processed_at = datetime.now(timezone.utc)
            req.processed_by_admin_id = user.id if user else None
            await session.commit()
            await session.refresh(req)
            raise BusinessLogicError(f"No se pudo completar la transferencia: {str(exc)}")

    return WithdrawalRequestResponse(
        id=req.id,
        athlete_id=req.athlete_id,
        athlete_handle=req.athlete.handle if req.athlete else None,
        athlete_name=req.athlete.user.full_name if req.athlete and req.athlete.user else None,
        amount_usd=req.amount_usd,
        currency=req.currency,
        destination_country=req.destination_country,
        status=req.status,
        stripe_transfer_id=req.stripe_transfer_id,
        failure_reason=req.failure_reason,
        admin_notes=req.admin_notes,
        requested_at=req.requested_at,
        processed_at=req.processed_at,
    )
