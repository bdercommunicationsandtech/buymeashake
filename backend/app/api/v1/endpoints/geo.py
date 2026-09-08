"""Geo catalog endpoints: countries / states / cities."""
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import DatabaseSession
from app.models.entities import City, Country, State

router = APIRouter(prefix="/geo")


class CountryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    iso2: str | None = None
    emoji: str | None = None


class StateItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    country_id: int
    country_code: str
    iso2: str | None = None


class CityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    state_id: int
    country_id: int
    country_code: str
    state_code: str | None = None


class CityDetail(BaseModel):
    id: int
    name: str
    state_id: int
    state_name: str | None = None
    country_id: int
    country_code: str
    country_name: str | None = None
    label: str


@router.get("/countries", response_model=list[CountryItem])
async def list_countries(session: DatabaseSession) -> list[CountryItem]:
    result = await session.execute(
        select(Country).where(Country.flag.is_(True)).order_by(Country.name.asc())
    )
    return [CountryItem.model_validate(c) for c in result.scalars().all()]


@router.get("/states", response_model=list[StateItem])
async def list_states(
    session: DatabaseSession,
    country_id: Annotated[int | None, Query()] = None,
    country_code: Annotated[str | None, Query(min_length=2, max_length=2)] = None,
) -> list[StateItem]:
    query = select(State).where(State.flag.is_(True))
    if country_id is not None:
        query = query.where(State.country_id == country_id)
    if country_code:
        query = query.where(State.country_code == country_code.upper())
    query = query.order_by(State.name.asc())
    result = await session.execute(query)
    return [StateItem.model_validate(s) for s in result.scalars().all()]


@router.get("/cities", response_model=list[CityItem])
async def list_cities(
    session: DatabaseSession,
    state_id: Annotated[int | None, Query()] = None,
    country_code: Annotated[str | None, Query(min_length=2, max_length=2)] = None,
    q: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> list[CityItem]:
    query = select(City).where(City.flag.is_(True))
    if state_id is not None:
        query = query.where(City.state_id == state_id)
    if country_code:
        query = query.where(City.country_code == country_code.upper())
    if q and q.strip():
        query = query.where(City.name.ilike(f"%{q.strip()}%"))
    query = query.order_by(City.name.asc()).limit(limit)
    result = await session.execute(query)
    return [CityItem.model_validate(c) for c in result.scalars().all()]


@router.get("/cities/{city_id}", response_model=CityDetail)
async def get_city(city_id: int, session: DatabaseSession) -> CityDetail:
    result = await session.execute(
        select(City)
        .options(selectinload(City.state), selectinload(City.country))
        .where(City.id == city_id)
    )
    city = result.scalar_one_or_none()
    if not city:
        from app.core.exceptions import EntityNotFoundError

        raise EntityNotFoundError("Ciudad", str(city_id))
    state_name = city.state.name if city.state else None
    country_name = city.country.name if city.country else None
    parts = [city.name]
    if state_name:
        parts.append(state_name)
    if city.country_code:
        parts.append(city.country_code)
    return CityDetail(
        id=city.id,
        name=city.name,
        state_id=city.state_id,
        state_name=state_name,
        country_id=city.country_id,
        country_code=city.country_code,
        country_name=country_name,
        label=", ".join(parts),
    )
