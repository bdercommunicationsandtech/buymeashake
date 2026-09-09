from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import DatabaseSession, OptionalUser
from app.schemas.dtos import AthleteLeaderboardItemResponse, CreatorPublicProfileResponse, PostResponse
from app.services.core_services import AthleteService

router = APIRouter()


@router.get("/explore/leaderboard", response_model=list[AthleteLeaderboardItemResponse])
async def get_monthly_leaderboard(
    session: DatabaseSession,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> list[AthleteLeaderboardItemResponse]:
    """Retorna el Top 10 mensual de atletas ordenado por número de shakes recibidos."""
    service = AthleteService(session)
    return await service.get_monthly_leaderboard(limit)


@router.get("/explore/athletes", response_model=list[AthleteLeaderboardItemResponse])
async def get_explore_athletes(
    session: DatabaseSession,
    q: Annotated[str | None, Query(description="Término de búsqueda por nombre, handle o disciplina")] = None,
    category: Annotated[str | None, Query(description="Disciplina o categoría")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[AthleteLeaderboardItemResponse]:
    """Retorna el directorio completo de atletas para exploración con filtros de búsqueda y disciplina."""
    service = AthleteService(session)
    return await service.get_explore_athletes(query=q, category=category, limit=limit)


@router.get("/creators/{handle}", response_model=CreatorPublicProfileResponse)
async def get_creator_profile(handle: str, session: DatabaseSession) -> CreatorPublicProfileResponse:
    """Retorna el perfil público completo de un atleta, su meta activa y servicios 1-a-1."""
    service = AthleteService(session)
    return await service.get_by_handle(handle)


@router.get("/creators/{handle}/posts", response_model=list[PostResponse])
async def get_creator_posts(
    handle: str,
    session: DatabaseSession,
    viewer: OptionalUser,
) -> list[PostResponse]:
    """Publicaciones del perfil: public + gated (teaser si el viewer no tiene acceso)."""
    service = AthleteService(session)
    return await service.get_public_posts(handle, viewer=viewer)


@router.get("/creators/{handle}/posts/{post_id}", response_model=PostResponse)
async def get_creator_post(
    handle: str,
    post_id: int,
    session: DatabaseSession,
    viewer: OptionalUser,
) -> PostResponse:
    """Detalle de publicación; gated sin entitlement solo recibe teaser/paywall."""
    service = AthleteService(session)
    return await service.get_public_post(handle, post_id, viewer=viewer)
