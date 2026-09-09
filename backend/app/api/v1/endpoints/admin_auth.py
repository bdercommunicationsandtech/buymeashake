import logging
from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentAdmin, DatabaseSession
from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.repositories.base_repos import UserRepository
from app.schemas.dtos import AdminLoginRequest, AdminLoginResponse, AdminMeResponse
from app.services import user_roles_service as user_roles

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


async def _verify_turnstile_if_configured(token: str | None) -> None:
    secret = (getattr(settings, "CLOUDFLARE_TURNSTILE_SECRET_KEY", "") or "").strip()
    if not secret:
        return
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere el token de verificación de Cloudflare Turnstile.",
        )
    try:
        import httpx

        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={"secret": secret, "response": token},
            )
            verification = res.json()
            if not verification.get("success"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Validación de CAPTCHA inválida o expirada.",
                )
    except HTTPException:
        raise
    except Exception as exc:
        # Fail-open en caso de problemas de conectividad con Cloudflare
        logger.warning("Turnstile verify failed open: %s", exc)


def _split_full_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split(None, 1)
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


def _to_admin_me(
    *,
    user_id: int,
    email: str,
    full_name: str,
    avatar_url: str | None,
    roles: list[str],
) -> AdminMeResponse:
    first_name, last_name = _split_full_name(full_name)
    username = (email or "").split("@")[0] or first_name or "admin"
    return AdminMeResponse(
        id=user_id,
        email=email,
        full_name=full_name,
        username=username,
        first_name=first_name,
        last_name=last_name,
        roles=roles,
        is_admin=user_roles.ROLE_ADMIN in roles,
        avatar_url=avatar_url,
    )


@router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(dto: AdminLoginRequest, session: DatabaseSession) -> AdminLoginResponse:
    """Login del panel admin. 401 credenciales; 403 sin rol admin."""
    await _verify_turnstile_if_configured(dto.cf_turnstile_token)

    email = str(dto.email).strip().lower()
    user_repo = UserRepository(session)
    user = await user_repo.get_by_email(email)

    if not user or not user.password_hash:
        raise UnauthorizedError("Correo o contraseña incorrectos.")
    if not verify_password(dto.password, user.password_hash):
        raise UnauthorizedError("Correo o contraseña incorrectos.")

    if not await user_roles.is_admin(session, user.id):
        raise ForbiddenError("No tienes permisos para acceder al panel de administración.")

    return AdminLoginResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        expires_in=60 * 24 * 7 * 60,
    )


@router.get("/admin/me", response_model=AdminMeResponse)
async def admin_me(user: CurrentAdmin, session: DatabaseSession) -> AdminMeResponse:
    """Perfil del administrador autenticado."""
    roles = await user_roles.get_active_role_names(session, user.id)
    if user_roles.ROLE_ADMIN not in roles:
        raise ForbiddenError("No tienes permisos para acceder al panel de administración.")

    return _to_admin_me(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        roles=roles,
    )
