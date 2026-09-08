import json
import random
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.dependencies import DatabaseSession
from app.core.config import settings
from app.repositories.base_repos import AthleteRepository
from app.schemas.dtos import (
    AdminReportVerdictRequest,
    AdminReportVerdictResponse,
    AppVersionCheckResponse,
    ComplianceReportRequest,
    ComplianceReportResponse,
    LookupGroupResponse,
)
from app.services.core_services import SystemService
from app.services.email_service import (
    send_compliance_report_sync,
    send_report_verdict_sync,
    send_reporter_confirmation_sync,
)

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


@router.post("/system/report", response_model=ComplianceReportResponse)
async def submit_compliance_report(
    request: Request,
    background_tasks: BackgroundTasks,
    session: DatabaseSession,
) -> ComplianceReportResponse:
    """Registra una denuncia por conducta o infracción deportiva con soporte de archivo adjunto multipart o JSON."""
    content_type = request.headers.get("content-type", "")
    attached_file = None
    attached_file_bytes = None
    attached_file_type = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        creator_target = str(form.get("creator_target", "")).strip()
        reason_code = str(form.get("reason_code", "")).strip()
        reason_title = str(form.get("reason_title", "")).strip()
        description = str(form.get("description", "")).strip()
        reporter_email = str(form.get("reporter_email", "")).strip()
        evidence_links_raw = form.get("evidence_links")
        evidence_links = []
        if evidence_links_raw:
            try:
                evidence_links = json.loads(evidence_links_raw) if isinstance(evidence_links_raw, str) else list(evidence_links_raw)
            except Exception:
                evidence_links = [str(evidence_links_raw)]

        file_item = form.get("file")
        if file_item and hasattr(file_item, "read"):
            attached_file = getattr(file_item, "filename", None) or "evidencia_adjunta.png"
            attached_file_bytes = await file_item.read()
            attached_file_type = getattr(file_item, "content_type", None) or "application/octet-stream"
        elif form.get("attached_file"):
            attached_file = str(form.get("attached_file"))
    else:
        body = await request.json()
        payload = ComplianceReportRequest(**body)
        creator_target = payload.creator_target.strip()
        reason_code = payload.reason_code
        reason_title = payload.reason_title
        description = payload.description
        evidence_links = payload.evidence_links
        attached_file = payload.attached_file
        reporter_email = payload.reporter_email

    # 1. Normalizar y extraer el handle limpio
    clean_handle = (
        creator_target.replace("https://", "")
        .replace("http://", "")
        .replace("www.", "")
        .replace("buymeashake.fit/", "")
        .replace("@", "")
        .split("/")[0]
        .split("?")[0]
        .strip()
        .lower()
    )

    if not clean_handle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes especificar un enlace o nombre de usuario de creador válido.",
        )

    # 2. Validar que el atleta exista en la base de datos
    athlete_repo = AthleteRepository(session)
    athlete = await athlete_repo.get_by_handle(clean_handle)
    if not athlete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"El creador o atleta '@{clean_handle}' no existe en Buymeashake.",
        )

    athlete_display = f"@{athlete.handle}"
    if athlete.user and athlete.user.full_name:
        athlete_display = f"@{athlete.handle} ({athlete.user.full_name})"

    folio_num = random.randint(10000, 99999)
    folio = f"SHK-{folio_num}"

    # 3. Enviar notificación al equipo interno de cumplimiento (bdercommunications@gmail.com)
    background_tasks.add_task(
        send_compliance_report_sync,
        to_email=settings.EMAILS_FROM_EMAIL,
        folio=folio,
        creator_target=athlete_display,
        reason_code=reason_code,
        reason_title=reason_title,
        description=description,
        evidence_links=evidence_links,
        attached_file=attached_file,
        reporter_email=reporter_email,
        attached_file_bytes=attached_file_bytes,
        attached_file_type=attached_file_type,
    )

    # 4. Enviar acuse de recibo de confirmación confidencial al denunciante
    background_tasks.add_task(
        send_reporter_confirmation_sync,
        to_email=reporter_email,
        folio=folio,
        creator_target=athlete_display,
        reason_code=reason_code,
        reason_title=reason_title,
    )

    return ComplianceReportResponse(
        folio=folio,
        message="Tu reporte ha sido registrado con éxito bajo estricta confidencialidad.",
        status="received",
    )


@router.post("/admin/compliance/reports/{folio}/verdict", response_model=AdminReportVerdictResponse)
async def submit_report_verdict(
    folio: str,
    payload: AdminReportVerdictRequest,
    background_tasks: BackgroundTasks,
) -> AdminReportVerdictResponse:
    """Envía la resolución oficial de un reporte desde el panel de administración al denunciante."""
    clean_folio = folio.strip()
    if not clean_folio.startswith("#"):
        clean_folio = f"#{clean_folio}"

    background_tasks.add_task(
        send_report_verdict_sync,
        to_email=payload.reporter_email,
        folio=clean_folio,
        creator_target=payload.creator_target,
        verdict=payload.verdict,
        verdict_title=payload.verdict_title,
        admin_notes=payload.admin_notes,
        action_details=payload.action_details,
    )

    return AdminReportVerdictResponse(
        folio=clean_folio,
        verdict=payload.verdict,
        status="resolved",
        email_sent=True,
        message=f"Dictamen del reporte {clean_folio} procesado y enviado con éxito.",
    )


