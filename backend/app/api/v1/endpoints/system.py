from typing import Literal

from fastapi import APIRouter

from app.api.dependencies import DatabaseSession
from app.schemas.dtos import AppVersionCheckResponse, LookupGroupResponse
from app.services.core_services import SystemService

router = APIRouter()


@router.get("/system/lookups", response_model=list[LookupGroupResponse])
async def get_all_lookups(session: DatabaseSession) -> list[LookupGroupResponse]:
    """Retorna todos los catálogos del sistema con códigos enteros (Deportes, Transacciones, etc.)."""
    service = SystemService(session)
    return await service.get_all_lookups()


@router.get("/system/app-version/check", response_model=AppVersionCheckResponse)
async def check_app_version(
    platform: Literal["ios", "android", "web"],
    version_code: int,
    session: DatabaseSession,
) -> AppVersionCheckResponse:
    """Verifica si la versión móvil requiere actualización obligatoria."""
    service = SystemService(session)
    return await service.check_app_version(platform, version_code)
