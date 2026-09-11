"""Public + admin endpoints for the canonical disciplines catalog."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.dependencies import CurrentAdmin, DatabaseSession
from app.models.entities import AthleteDiscipline, Discipline
from app.schemas.dtos import (
    DisciplineCreateRequest,
    DisciplineResponse,
    DisciplineUpdateRequest,
)

router = APIRouter()


def _to_response(row: Discipline) -> DisciplineResponse:
    return DisciplineResponse.model_validate(row)


@router.get("/disciplines", response_model=list[DisciplineResponse])
async def list_disciplines(
    session: DatabaseSession,
    home: bool = Query(default=False, description="Only disciplines shown on Home coverflow"),
) -> list[DisciplineResponse]:
    query = select(Discipline).where(Discipline.is_active.is_(True))
    if home:
        query = query.where(Discipline.show_in_home.is_(True))
    query = query.order_by(Discipline.sort_order.asc(), Discipline.name.asc())
    result = await session.execute(query)
    return [_to_response(row) for row in result.scalars().all()]


@router.get("/admin/disciplines/", response_model=list[DisciplineResponse])
async def admin_list_disciplines(
    session: DatabaseSession,
    _: CurrentAdmin,
) -> list[DisciplineResponse]:
    result = await session.execute(
        select(Discipline).order_by(Discipline.sort_order.asc(), Discipline.name.asc())
    )
    return [_to_response(row) for row in result.scalars().all()]


@router.post(
    "/admin/disciplines/",
    response_model=DisciplineResponse,
    status_code=status.HTTP_201_CREATED,
)
async def admin_create_discipline(
    payload: DisciplineCreateRequest,
    session: DatabaseSession,
    _: CurrentAdmin,
) -> DisciplineResponse:
    row = Discipline(
        name=payload.name.strip(),
        description=(payload.description or None),
        image_url=payload.image_url or None,
        icon_url=payload.icon_url or None,
        sort_order=payload.sort_order,
        show_in_home=payload.show_in_home,
        is_active=payload.is_active,
    )
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return _to_response(row)


@router.put("/admin/disciplines/{discipline_id}", response_model=DisciplineResponse)
async def admin_update_discipline(
    discipline_id: int,
    payload: DisciplineUpdateRequest,
    session: DatabaseSession,
    _: CurrentAdmin,
) -> DisciplineResponse:
    row = await session.get(Discipline, discipline_id)
    if not row:
        raise HTTPException(status_code=404, detail="Disciplina no encontrada.")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
    for key, value in data.items():
        setattr(row, key, value)

    await session.flush()
    await session.refresh(row)
    return _to_response(row)


@router.delete("/admin/disciplines/{discipline_id}", response_model=DisciplineResponse)
async def admin_deactivate_discipline(
    discipline_id: int,
    session: DatabaseSession,
    _: CurrentAdmin,
) -> DisciplineResponse:
    """Soft-delete: mark inactive (keeps athlete associations)."""
    row = await session.get(Discipline, discipline_id)
    if not row:
        raise HTTPException(status_code=404, detail="Disciplina no encontrada.")

    athlete_count = await session.scalar(
        select(func.count())
        .select_from(AthleteDiscipline)
        .where(AthleteDiscipline.discipline_id == discipline_id)
    )
    row.is_active = False
    if athlete_count and athlete_count > 0:
        row.show_in_home = False

    await session.flush()
    await session.refresh(row)
    return _to_response(row)
