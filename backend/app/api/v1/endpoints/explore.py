from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import DatabaseSession
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


@router.get("/creators/{handle}", response_model=CreatorPublicProfileResponse)
async def get_creator_profile(handle: str, session: DatabaseSession) -> CreatorPublicProfileResponse:
    """Retorna el perfil público completo de un atleta, su meta activa y servicios 1-a-1."""
    service = AthleteService(session)
    return await service.get_by_handle(handle)


@router.get("/creators/{handle}/posts", response_model=list[PostResponse])
async def get_creator_posts(handle: str, session: DatabaseSession) -> list[PostResponse]:
    """Retorna las publicaciones públicas del atleta."""
    service = AthleteService(session)
    return await service.get_public_posts(handle)


@router.get("/creators/{handle}/posts/{post_id}", response_model=PostResponse)
async def get_creator_post(handle: str, post_id: int, session: DatabaseSession) -> PostResponse:
    """Retorna una publicación pública completa del atleta."""
    service = AthleteService(session)
    return await service.get_public_post(handle, post_id)
