from fastapi import APIRouter, Query

from app.api.dependencies import CurrentUser, DatabaseSession
from app.schemas.dtos import (
    FollowedAthleteResponse,
    PaginatedResponse,
    PostCommentCreateRequest,
    PostCommentResponse,
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
    access_type: str | None = Query(
        default=None,
        pattern="^(public|shake_supporters|members_only)$",
        description="Filtra el feed por categoría de visibilidad del post",
    ),
) -> PaginatedResponse[PostResponse]:
    """Obtiene el feed de publicaciones de los atletas seguidos por el supporter autenticado."""
    service = SupporterService(session)
    return await service.get_feed(
        supporter_id=user.id,
        page=page,
        page_size=page_size,
        access_type=access_type,
    )


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


@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: int,
    user: CurrentUser,
    session: DatabaseSession,
) -> dict:
    """Toggle like: si ya existe lo quita; si no, lo agrega."""
    service = SupporterService(session)
    return await service.like_post(post_id=post_id, user_id=user.id)


@router.post("/posts/{post_id}/comments", response_model=PostCommentResponse)
async def comment_on_post(
    post_id: int,
    dto: PostCommentCreateRequest,
    user: CurrentUser,
    session: DatabaseSession,
) -> PostCommentResponse:
    """Agrega un comentario a una publicación."""
    service = SupporterService(session)
    return await service.comment_post(user=user, post_id=post_id, content=dto.content)


@router.delete("/posts/{post_id}/comments/{comment_id}")
async def delete_post_comment(
    post_id: int,
    comment_id: int,
    user: CurrentUser,
    session: DatabaseSession,
) -> dict:
    """Elimina un comentario propio de una publicación."""
    service = SupporterService(session)
    return await service.delete_comment(user=user, post_id=post_id, comment_id=comment_id)
