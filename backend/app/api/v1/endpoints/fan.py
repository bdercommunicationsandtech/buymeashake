from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.dtos import (
    FollowedAthleteResponse,
    PaginatedResponse,
    PostResponse,
)
from app.services.core_services import SupporterService

router = APIRouter(prefix="/fan")


@router.get("/feed", response_model=PaginatedResponse[PostResponse])
async def get_fan_feed(
    user: CurrentUser,
    session: DatabaseSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
) -> PaginatedResponse[PostResponse]:
    """Obtiene el feed de publicaciones de los atletas seguidos por el supporter autenticado."""
    service = SupporterService(session)
    return await service.get_feed(supporter_id=user.id, page=page, page_size=page_size)


@router.get("/following", response_model=list[FollowedAthleteResponse])
async def get_fan_following(
    user: CurrentUser,
    session: DatabaseSession,
) -> list[FollowedAthleteResponse]:
    """Obtiene la lista de atletas que sigue el supporter autenticado."""
    service = SupporterService(session)
    return await service.get_following(supporter_id=user.id)


@router.get("/follow/{athlete_handle}/status")
async def check_follow_status(
    athlete_handle: str,
    user: CurrentUser,
    session: DatabaseSession,
) -> dict:
    """Verifica si el usuario autenticado sigue a un atleta."""
    service = SupporterService(session)
    return await service.check_following(supporter_id=user.id, handle=athlete_handle)


@router.post("/follow/{athlete_handle}")
async def follow_athlete(
    athlete_handle: str,
    user: CurrentUser,
    session: DatabaseSession,
) -> dict:
    """Permite al usuario autenticado seguir a un atleta por su handle."""
    service = SupporterService(session)
    return await service.follow_athlete(supporter_id=user.id, handle=athlete_handle)


@router.delete("/follow/{athlete_handle}")
async def unfollow_athlete(
    athlete_handle: str,
    user: CurrentUser,
    session: DatabaseSession,
) -> dict:
    """Permite al usuario autenticado dejar de seguir a un atleta."""
    service = SupporterService(session)
    return await service.unfollow_athlete(supporter_id=user.id, handle=athlete_handle)
