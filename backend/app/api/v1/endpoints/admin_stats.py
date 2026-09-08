"""Estadísticas del panel admin: usuarios por rol + GMV + recientes."""
from decimal import Decimal

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentAdmin, DatabaseSession
from app.models.entities import Transaction, User, UserRole
from app.schemas.dtos import (
    AdminGmvStats,
    AdminPlatformStatsResponse,
    AdminRecentUserItem,
    AdminUserCounts,
)
from app.services import user_roles_service as user_roles

router = APIRouter()

STATUS_SUCCESS = 302
TYPE_SHAKE = 201
TYPE_MEMBERSHIP = 202
TYPE_SHOP = 203
TYPE_BOOKING = 204
RECENT_LIMIT = 10


async def _recent_by_product_role(
    session: DatabaseSession,
    role_name: str,
    *,
    with_handle: bool = False,
) -> list[AdminRecentUserItem]:
    role_id = await user_roles._role_item_id(session, role_name)
    active_id = await user_roles._active_status_id(session)

    query = (
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .where(UserRole.role_id == role_id, UserRole.status_id == active_id)
        .order_by(User.created_at.desc(), User.id.desc())
        .limit(RECENT_LIMIT)
    )
    if with_handle:
        query = query.options(selectinload(User.athlete_profile))

    result = await session.execute(query)
    users = list(result.scalars().unique().all())

    items: list[AdminRecentUserItem] = []
    for u in users:
        handle = None
        if with_handle and u.athlete_profile:
            handle = u.athlete_profile.handle
        items.append(
            AdminRecentUserItem(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=role_name,
                created_at=u.created_at,
                athlete_handle=handle,
            )
        )
    return items


@router.get("/admin/stats", response_model=AdminPlatformStatsResponse)
async def admin_platform_stats(
    _admin: CurrentAdmin,
    session: DatabaseSession,
) -> AdminPlatformStatsResponse:
    """KPIs de plataforma: conteos, GMV y últimos registros."""
    supporters = await user_roles.count_active_role(session, user_roles.ROLE_SUPPORTER)
    athletes = await user_roles.count_active_role(session, user_roles.ROLE_ATHLETE)

    gmv_query = (
        select(
            Transaction.transaction_type_code,
            func.coalesce(func.sum(Transaction.gross_amount), 0).label("total_gross"),
            func.count(Transaction.id).label("tx_count"),
        )
        .where(Transaction.status_code == STATUS_SUCCESS)
        .group_by(Transaction.transaction_type_code)
    )
    result = await session.execute(gmv_query)
    rows = result.all()

    by_type: dict[int, Decimal] = {
        TYPE_SHAKE: Decimal("0.00"),
        TYPE_MEMBERSHIP: Decimal("0.00"),
        TYPE_SHOP: Decimal("0.00"),
        TYPE_BOOKING: Decimal("0.00"),
    }
    successful_count = 0
    total = Decimal("0.00")

    for row in rows:
        amount = Decimal(str(row.total_gross or 0))
        count = int(row.tx_count or 0)
        successful_count += count
        total += amount
        code = int(row.transaction_type_code)
        if code in by_type:
            by_type[code] = amount

    recent_supporters = await _recent_by_product_role(
        session, user_roles.ROLE_SUPPORTER
    )
    recent_athletes = await _recent_by_product_role(
        session, user_roles.ROLE_ATHLETE, with_handle=True
    )

    return AdminPlatformStatsResponse(
        users=AdminUserCounts(
            supporters=supporters,
            athletes=athletes,
            total=supporters + athletes,
        ),
        gmv=AdminGmvStats(
            total=total.quantize(Decimal("0.01")),
            currency="USD",
            shakes=by_type[TYPE_SHAKE].quantize(Decimal("0.01")),
            memberships=by_type[TYPE_MEMBERSHIP].quantize(Decimal("0.01")),
            shop=by_type[TYPE_SHOP].quantize(Decimal("0.01")),
            bookings=by_type[TYPE_BOOKING].quantize(Decimal("0.01")),
            successful_count=successful_count,
        ),
        recent_supporters=recent_supporters,
        recent_athletes=recent_athletes,
    )
