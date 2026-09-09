"""Endpoints de gestión y catálogo de usuarios para el panel admin."""
from __future__ import annotations

import math
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentAdmin, DatabaseSession
from app.core.exceptions import EntityNotFoundError
from app.models.entities import AthleteProfile, Goal, ShakeDetails, Transaction, User, UserRole
from app.schemas.dtos import (
    AdminGoalSummary,
    AdminUserCatalogItem,
    AdminUserCatalogResponse,
    AdminUserDetailResponse,
    AdminUserFinancialSummary,
)
from app.services import user_roles_service as user_roles

router = APIRouter()

STATUS_SUCCESS = 302


def _goal_to_summary(g: Goal) -> AdminGoalSummary:
    target = Decimal(str(g.target_amount or 0))
    raised = Decimal(str(g.raised_amount or 0))
    pct = 0.0
    if target > 0:
        pct = float(round((raised / target) * 100, 1))
    return AdminGoalSummary(
        id=g.id,
        title=g.title,
        cover_image_url=g.cover_image_url,
        target_amount=target.quantize(Decimal("0.01")),
        raised_amount=raised.quantize(Decimal("0.01")),
        currency=g.currency or "USD",
        is_active=bool(g.is_active),
        progress_pct=pct,
        achieved_at=g.achieved_at,
        created_at=g.created_at,
    )


@router.get("/admin/users", response_model=AdminUserCatalogResponse)
async def list_admin_users(
    _admin: CurrentAdmin,
    session: DatabaseSession,
    search: Optional[str] = Query(None, description="Buscar por nombre, correo o handle"),
    role: Optional[str] = Query(None, description="Filtrar por rol: athlete, supporter, admin, all"),
    status: Optional[str] = Query(None, description="Filtrar por estado: active, inactive, all"),
    goals_filter: Optional[str] = Query(None, description="Filtrar por metas: with_goals, without_goals, all"),
    revenue_filter: Optional[str] = Query(None, description="Filtrar por recaudación: with_revenue, no_revenue, na, all"),
    sort_by: Optional[str] = Query(None, description="name, created_at"),
    sort_order: Optional[str] = Query("desc", description="asc, desc"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(20, ge=1, le=100, description="Elementos por página"),
) -> AdminUserCatalogResponse:
    """Catálogo paginado de usuarios con filtros por nombre, rol, estado, metas, recaudación y ordenamiento."""
    active_status_id = await user_roles._active_status_id(session)

    # Base queries
    query = select(User).distinct()
    count_query = select(func.count(func.distinct(User.id)))

    # 1. Role filter
    normalized_role = (role or "").strip().lower()
    if normalized_role and normalized_role != "all":
        role_id = await user_roles._role_item_id(session, normalized_role)
        query = query.join(UserRole, UserRole.user_id == User.id).where(
            UserRole.role_id == role_id,
            UserRole.status_id == active_status_id,
        )
        count_query = count_query.join(UserRole, UserRole.user_id == User.id).where(
            UserRole.role_id == role_id,
            UserRole.status_id == active_status_id,
        )

    # 2. Status filter (active / inactive)
    normalized_status = (status or "").strip().lower()
    if normalized_status == "active":
        active_user_ids = select(UserRole.user_id).where(UserRole.status_id == active_status_id)
        query = query.where(User.id.in_(active_user_ids))
        count_query = count_query.where(User.id.in_(active_user_ids))
    elif normalized_status == "inactive":
        active_user_ids = select(UserRole.user_id).where(UserRole.status_id == active_status_id)
        query = query.where(User.id.not_in(active_user_ids))
        count_query = count_query.where(User.id.not_in(active_user_ids))

    # 3. Goals filter (with_goals / without_goals)
    normalized_goals = (goals_filter or "").strip().lower()
    if normalized_goals in ("with_goals", "without_goals"):
        athletes_with_active_goals = (
            select(AthleteProfile.user_id)
            .join(Goal, Goal.athlete_id == AthleteProfile.id)
            .where(Goal.is_active.is_(True))
        )
        if normalized_goals == "with_goals":
            query = query.where(User.id.in_(athletes_with_active_goals))
            count_query = count_query.where(User.id.in_(athletes_with_active_goals))
        else:
            query = query.where(User.id.not_in(athletes_with_active_goals))
            count_query = count_query.where(User.id.not_in(athletes_with_active_goals))

    # 4. Revenue filter (with_revenue / no_revenue / na)
    normalized_rev = (revenue_filter or "").strip().lower()
    if normalized_rev in ("with_revenue", "no_revenue", "na"):
        athlete_user_ids = select(AthleteProfile.user_id)
        athletes_with_revenue = (
            select(AthleteProfile.user_id)
            .join(Transaction, Transaction.athlete_id == AthleteProfile.id)
            .where(Transaction.status_code == STATUS_SUCCESS)
            .group_by(AthleteProfile.user_id)
            .having(func.sum(Transaction.gross_amount) > 0)
        )
        if normalized_rev == "with_revenue":
            query = query.where(User.id.in_(athletes_with_revenue))
            count_query = count_query.where(User.id.in_(athletes_with_revenue))
        elif normalized_rev == "no_revenue":
            query = query.where(User.id.in_(athlete_user_ids), User.id.not_in(athletes_with_revenue))
            count_query = count_query.where(User.id.in_(athlete_user_ids), User.id.not_in(athletes_with_revenue))
        elif normalized_rev == "na":
            query = query.where(User.id.not_in(athlete_user_ids))
            count_query = count_query.where(User.id.not_in(athlete_user_ids))

    # 5. Search filter (name, email, athlete handle)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.outerjoin(AthleteProfile, AthleteProfile.user_id == User.id)
        count_query = count_query.outerjoin(AthleteProfile, AthleteProfile.user_id == User.id)
        filter_expr = or_(
            User.full_name.ilike(term),
            User.email.ilike(term),
            AthleteProfile.handle.ilike(term),
        )
        query = query.where(filter_expr)
        count_query = count_query.where(filter_expr)

    # Total count
    count_res = await session.execute(count_query)
    total = int(count_res.scalar_one_or_none() or 0)
    total_pages = math.ceil(total / limit) if total > 0 else 1

    # Sorting
    norm_sort_by = (sort_by or "").strip().lower()
    norm_order = (sort_order or "desc").strip().lower()
    if norm_sort_by == "name":
        order_expr = User.full_name.asc() if norm_order == "asc" else User.full_name.desc()
    elif norm_sort_by == "created_at":
        order_expr = User.created_at.asc() if norm_order == "asc" else User.created_at.desc()
    else:
        order_expr = User.created_at.asc() if norm_order == "asc" else User.created_at.desc()

    # Paged users
    offset = (page - 1) * limit
    query = (
        query.options(
            selectinload(User.athlete_profile),
            selectinload(User.user_roles).selectinload(UserRole.role_item),
        )
        .order_by(order_expr, User.id.desc())
        .offset(offset)
        .limit(limit)
    )

    res = await session.execute(query)
    users = list(res.scalars().unique().all())

    if not users:
        return AdminUserCatalogResponse(
            items=[],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        )

    user_ids = [u.id for u in users]
    athlete_map: dict[int, AthleteProfile] = {}
    athlete_ids: list[int] = []
    for u in users:
        if u.athlete_profile:
            athlete_map[u.athlete_profile.id] = u.athlete_profile
            athlete_ids.append(u.athlete_profile.id)

    # 1. Fetch active goals for athletes on this page
    active_goals_by_athlete: dict[int, list[AdminGoalSummary]] = {aid: [] for aid in athlete_ids}
    total_goals_count_by_athlete: dict[int, int] = {aid: 0 for aid in athlete_ids}

    if athlete_ids:
        goals_query = (
            select(Goal)
            .where(Goal.athlete_id.in_(athlete_ids))
            .order_by(Goal.is_active.desc(), Goal.created_at.desc())
        )
        goals_res = await session.execute(goals_query)
        all_goals = list(goals_res.scalars().all())

        for g in all_goals:
            total_goals_count_by_athlete[g.athlete_id] = total_goals_count_by_athlete.get(g.athlete_id, 0) + 1
            if g.is_active:
                active_goals_by_athlete[g.athlete_id].append(_goal_to_summary(g))

    # 2. Fetch financial totals (gross raised, shakes count, successful transactions) for athletes
    athlete_financials: dict[int, dict] = {
        aid: {"total_raised": Decimal("0.00"), "tx_count": 0, "shakes_count": 0}
        for aid in athlete_ids
    }
    if athlete_ids:
        tx_query = (
            select(
                Transaction.athlete_id,
                func.coalesce(func.sum(Transaction.gross_amount), 0).label("total_gross"),
                func.count(Transaction.id).label("tx_count"),
            )
            .where(
                Transaction.athlete_id.in_(athlete_ids),
                Transaction.status_code == STATUS_SUCCESS,
            )
            .group_by(Transaction.athlete_id)
        )
        tx_res = await session.execute(tx_query)
        for row in tx_res.all():
            aid = int(row.athlete_id)
            athlete_financials[aid]["total_raised"] = Decimal(str(row.total_gross or 0))
            athlete_financials[aid]["tx_count"] = int(row.tx_count or 0)

        # Shakes sum
        shake_query = (
            select(
                Transaction.athlete_id,
                func.coalesce(func.sum(ShakeDetails.shakes_count), 0).label("total_shakes"),
            )
            .join(ShakeDetails, ShakeDetails.transaction_id == Transaction.id)
            .where(
                Transaction.athlete_id.in_(athlete_ids),
                Transaction.status_code == STATUS_SUCCESS,
            )
            .group_by(Transaction.athlete_id)
        )
        shake_res = await session.execute(shake_query)
        for row in shake_res.all():
            aid = int(row.athlete_id)
            athlete_financials[aid]["shakes_count"] = int(row.total_shakes or 0)

    # 3. Fetch supporter contributions for non-athletes or all users
    supporter_contributions: dict[int, Decimal] = {uid: Decimal("0.00") for uid in user_ids}
    supp_query = (
        select(
            Transaction.supporter_id,
            func.coalesce(func.sum(Transaction.gross_amount), 0).label("total_contributed"),
        )
        .where(
            Transaction.supporter_id.in_(user_ids),
            Transaction.status_code == STATUS_SUCCESS,
        )
        .group_by(Transaction.supporter_id)
    )
    supp_res = await session.execute(supp_query)
    for row in supp_res.all():
        if row.supporter_id:
            supporter_contributions[int(row.supporter_id)] = Decimal(str(row.total_contributed or 0))

    # Assemble response items
    items: list[AdminUserCatalogItem] = []
    for u in users:
        # Extract active roles and is_active flag
        user_role_names: list[str] = []
        is_user_active = False
        for ur in u.user_roles:
            if ur.status_id == active_status_id:
                is_user_active = True
                if ur.role_item and ur.role_item.label:
                    user_role_names.append(str(ur.role_item.label).strip().lower())
        if not u.user_roles:
            is_user_active = True

        athlete_id = u.athlete_profile.id if u.athlete_profile else None
        athlete_handle = u.athlete_profile.handle if u.athlete_profile else None
        is_verified = bool(u.athlete_profile.is_verified) if u.athlete_profile else False

        active_goals: list[AdminGoalSummary] = []
        total_goals = 0
        fin_data = {"total_raised": Decimal("0.00"), "tx_count": 0, "shakes_count": 0}

        if athlete_id is not None:
            active_goals = active_goals_by_athlete.get(athlete_id, [])
            total_goals = total_goals_count_by_athlete.get(athlete_id, 0)
            fin_data = athlete_financials.get(athlete_id, fin_data)

        contributed = supporter_contributions.get(u.id, Decimal("0.00"))

        financials = AdminUserFinancialSummary(
            total_raised=fin_data["total_raised"].quantize(Decimal("0.01")),
            currency="USD",
            successful_tx_count=fin_data["tx_count"],
            total_shakes_count=fin_data["shakes_count"],
            total_contributed=contributed.quantize(Decimal("0.01")),
        )

        items.append(
            AdminUserCatalogItem(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                avatar_url=u.avatar_url,
                is_email_verified=bool(u.is_email_verified),
                is_active=is_user_active,
                created_at=u.created_at,
                roles=user_role_names,
                athlete_id=athlete_id,
                athlete_handle=athlete_handle,
                is_verified_athlete=is_verified,
                active_goals=active_goals,
                active_goals_count=len(active_goals),
                total_goals_count=total_goals,
                financials=financials,
            )
        )

    return AdminUserCatalogResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/admin/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_admin_user_detail(
    user_id: int,
    _admin: CurrentAdmin,
    session: DatabaseSession,
) -> AdminUserDetailResponse:
    """Detalle completo de un usuario con todas sus metas y resumen financiero."""
    active_status_id = await user_roles._active_status_id(session)

    res = await session.execute(
        select(User)
        .options(
            selectinload(User.athlete_profile),
            selectinload(User.user_roles).selectinload(UserRole.role_item),
        )
        .where(User.id == user_id)
    )
    user = res.scalar_one_or_none()
    if not user:
        raise EntityNotFoundError("Usuario", user_id)

    user_role_names = [
        str(ur.role_item.label).strip().lower()
        for ur in user.user_roles
        if ur.status_id == active_status_id and ur.role_item and ur.role_item.label
    ]

    athlete_id = user.athlete_profile.id if user.athlete_profile else None
    athlete_handle = user.athlete_profile.handle if user.athlete_profile else None
    is_verified = bool(user.athlete_profile.is_verified) if user.athlete_profile else False

    all_goals: list[AdminGoalSummary] = []
    active_goals: list[AdminGoalSummary] = []
    total_raised = Decimal("0.00")
    tx_count = 0
    shakes_count = 0

    if athlete_id is not None:
        goals_res = await session.execute(
            select(Goal).where(Goal.athlete_id == athlete_id).order_by(Goal.created_at.desc())
        )
        for g in goals_res.scalars().all():
            summary = _goal_to_summary(g)
            all_goals.append(summary)
            if g.is_active:
                active_goals.append(summary)

        tx_res = await session.execute(
            select(
                func.coalesce(func.sum(Transaction.gross_amount), 0).label("total_gross"),
                func.count(Transaction.id).label("tx_count"),
            )
            .where(
                Transaction.athlete_id == athlete_id,
                Transaction.status_code == STATUS_SUCCESS,
            )
        )
        tx_row = tx_res.one()
        total_raised = Decimal(str(tx_row.total_gross or 0))
        tx_count = int(tx_row.tx_count or 0)

        shake_res = await session.execute(
            select(func.coalesce(func.sum(ShakeDetails.shakes_count), 0).label("total_shakes"))
            .join(ShakeDetails, ShakeDetails.transaction_id == Transaction.id)
            .where(
                Transaction.athlete_id == athlete_id,
                Transaction.status_code == STATUS_SUCCESS,
            )
        )
        shakes_count = int(shake_res.scalar_one_or_none() or 0)

    supp_res = await session.execute(
        select(func.coalesce(func.sum(Transaction.gross_amount), 0).label("total_contributed"))
        .where(
            Transaction.supporter_id == user.id,
            Transaction.status_code == STATUS_SUCCESS,
        )
    )
    total_contributed = Decimal(str(supp_res.scalar_one_or_none() or 0))

    financials = AdminUserFinancialSummary(
        total_raised=total_raised.quantize(Decimal("0.01")),
        currency="USD",
        successful_tx_count=tx_count,
        total_shakes_count=shakes_count,
        total_contributed=total_contributed.quantize(Decimal("0.01")),
    )

    is_user_active = any(ur.status_id == active_status_id for ur in user.user_roles) if user.user_roles else True

    catalog_item = AdminUserCatalogItem(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        is_email_verified=bool(user.is_email_verified),
        is_active=is_user_active,
        created_at=user.created_at,
        roles=user_role_names,
        athlete_id=athlete_id,
        athlete_handle=athlete_handle,
        is_verified_athlete=is_verified,
        active_goals=active_goals,
        active_goals_count=len(active_goals),
        total_goals_count=len(all_goals),
        financials=financials,
    )

    return AdminUserDetailResponse(
        user=catalog_item,
        all_goals=all_goals,
        bio=user.athlete_profile.bio if user.athlete_profile else None,
        city=user.athlete_profile.city if user.athlete_profile else None,
    )
