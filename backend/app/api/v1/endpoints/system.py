from collections import defaultdict
import json
import random
import time
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status

from app.api.dependencies import CurrentAdmin, DatabaseSession
from app.core.config import settings
from app.core.exceptions import RateLimitExceededError
from app.repositories.base_repos import AthleteRepository
from app.schemas.dtos import (
    AdminReportVerdictRequest,
    AdminReportVerdictResponse,
    AppVersionCheckResponse,
    ComplianceReportRequest,
    ComplianceReportResponse,
    LookupGroupResponse,
    SupportTicketRequest,
    SupportTicketResponse,
)
from app.services.core_services import SystemService
from app.services.email_service import (
    send_compliance_report_sync,
    send_report_verdict_sync,
    send_reporter_confirmation_sync,
    send_support_ticket_sync,
    send_support_ticket_user_ack_sync,
)

router = APIRouter()


class InMemoryRateLimiter:
    """Limitador de frecuencia en memoria con ventana deslizante para prevenir abusos en endpoints públicos."""
    def __init__(self, max_requests: int = 5, window_seconds: int = 300):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str) -> None:
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < self.window_seconds]
        if len(self.requests[key]) >= self.max_requests:
            oldest = self.requests[key][0]
            wait = max(1, int(self.window_seconds - (now - oldest)))
            raise RateLimitExceededError(
                wait_seconds=wait,
                message=f"Has alcanzado el límite de solicitudes permitido. Por favor espera {wait} segundos antes de enviar nuevamente.",
            )
        self.requests[key].append(now)


report_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=300)
ticket_limiter = InMemoryRateLimiter(max_requests=5, window_seconds=300)


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


def determine_report_priority(reason_code: str, recent_reports_count: int = 0) -> str:
    """Clasifica la prioridad de la denuncia según la gravedad del motivo y la reincidencia."""
    code = (reason_code or "").strip().lower()

    # 1. Prioridad base según la gravedad del motivo
    if code in {"doping", "medical_risk", "impersonation"}:
        base_priority = "critical"
    elif code in {"scam_fraud", "fraud", "harassment", "hate_speech", "unfulfilled_order"}:
        base_priority = "high"
    elif code in {"ip_theft", "copyright", "inappropriate", "nsfw", "other"}:
        base_priority = "medium"
    elif code in {"spam"}:
        base_priority = "low"
    else:
        base_priority = "medium"

    # 2. Escalación por reincidencia (si el creador ya tiene reportes activos previos)
    if recent_reports_count >= 3:
        return "critical"
    elif recent_reports_count >= 1 and base_priority in {"medium", "low"}:
        return "high"

    return base_priority


@router.post("/system/report", response_model=ComplianceReportResponse)
async def submit_compliance_report(
    request: Request,
    background_tasks: BackgroundTasks,
    session: DatabaseSession,
) -> ComplianceReportResponse:
    """Registra una denuncia por conducta o infracción deportiva con soporte de archivo adjunto multipart o JSON."""
    client_ip = request.client.host if request.client else "unknown"
    report_limiter.check(f"ip:{client_ip}")

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

    if reporter_email and reporter_email.lower() != "confidencial":
        report_limiter.check(f"email:{reporter_email.strip().lower()}")

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

    # 2. Validar si el atleta existe en la base de datos
    athlete_repo = AthleteRepository(session)
    athlete = await athlete_repo.get_by_handle(clean_handle)

    if athlete:
        athlete_display = f"@{athlete.handle}"
        if athlete.user and athlete.user.full_name:
            athlete_display = f"@{athlete.handle} ({athlete.user.full_name})"
    else:
        athlete_display = f"@{clean_handle}" if not creator_target.startswith("@") else creator_target

    folio_num = random.randint(10000, 99999)
    folio = f"SHK-{folio_num}"

    # 3. Persistir el reporte en la base de datos con prioridad calculada
    from app.models.entities import ComplianceReport
    from sqlalchemy import func, select

    recent_reports_count = 0
    if athlete:
        recent_res = await session.execute(
            select(func.count(ComplianceReport.id)).where(
                ComplianceReport.athlete_id == athlete.id,
                ComplianceReport.status.in_(["pending", "under_review", "resolved"]),
            )
        )
        recent_reports_count = recent_res.scalar() or 0

    calculated_priority = determine_report_priority(reason_code, recent_reports_count)

    report_record = ComplianceReport(
        folio=folio,
        creator_target=athlete_display,
        athlete_id=athlete.id if athlete else None,
        reporter_email=reporter_email,
        reason_code=reason_code,
        reason_title=reason_title,
        description=description,
        evidence_links=evidence_links,
        attached_file=attached_file,
        status="pending",
        priority=calculated_priority,
    )
    session.add(report_record)
    await session.commit()

    # 4. Enviar notificación al equipo interno de cumplimiento (bdercommunications@gmail.com)
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

    # 5. Enviar acuse de recibo de confirmación confidencial al denunciante
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
    _admin: CurrentAdmin,
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


@router.post("/system/support/ticket", response_model=SupportTicketResponse)
async def submit_support_ticket(
    request: Request,
    background_tasks: BackgroundTasks,
    session: DatabaseSession,
) -> SupportTicketResponse:
    """Registra un ticket de soporte/asistencia con persistencia en DB, generación de folio único y notificación dual."""
    client_ip = request.client.host if request.client else "unknown"
    ticket_limiter.check(f"ip:{client_ip}")

    content_type = request.headers.get("content-type", "")
    attached_file = None
    attached_file_bytes = None
    attached_file_type = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        name = str(form.get("name", "")).strip()
        email = str(form.get("email", "")).strip()
        user_role = str(form.get("user_role", "athlete")).strip()
        category = str(form.get("category", "general")).strip()
        category_title = str(form.get("category_title", "Consulta General")).strip()
        subject = str(form.get("subject", "")).strip()
        description = str(form.get("description", "")).strip()
        raw_ref = form.get("related_folio_or_handle")
        related_ref = str(raw_ref).strip() if raw_ref else None

        file_item = form.get("file")
        if file_item and hasattr(file_item, "read"):
            attached_file = getattr(file_item, "filename", None) or "evidencia_soporte.png"
            attached_file_bytes = await file_item.read()
            attached_file_type = getattr(file_item, "content_type", None) or "application/octet-stream"
        elif form.get("attached_file"):
            attached_file = str(form.get("attached_file"))
    else:
        body = await request.json()
        payload = SupportTicketRequest(**body)
        name = payload.name.strip()
        email = payload.email.strip()
        user_role = payload.user_role
        category = payload.category
        category_title = payload.category_title
        subject = payload.subject.strip()
        description = payload.description.strip()
        related_ref = payload.related_folio_or_handle
        attached_file = payload.attached_file

    if email:
        ticket_limiter.check(f"email:{email.strip().lower()}")

    if not name or not email or not subject or not description:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Por favor completa los campos requeridos del ticket de soporte.",
        )

    folio_num = random.randint(10000, 99999)
    folio = f"#SHK-HELP-{folio_num}"

    # Persistir ticket en la base de datos
    from app.models.entities import SupportTicket
    ticket_record = SupportTicket(
        folio=folio,
        name=name,
        email=email,
        user_role=user_role,
        category=category,
        category_title=category_title,
        subject=subject,
        description=description,
        related_folio_or_handle=related_ref,
        attached_file=attached_file,
        is_read=False,
        status="open",
    )
    session.add(ticket_record)
    await session.commit()
    await session.refresh(ticket_record)

    # 1. Notificar al equipo de soporte interno de Buymeashake
    background_tasks.add_task(
        send_support_ticket_sync,
        folio=folio,
        name=name,
        user_email=email,
        user_role=user_role,
        category=category,
        category_title=category_title,
        subject=subject,
        description=description,
        related_folio_or_handle=related_ref,
        attached_file=attached_file,
        attached_file_bytes=attached_file_bytes,
        attached_file_type=attached_file_type,
    )

    # 2. Enviar acuse de recibo formal al usuario
    background_tasks.add_task(
        send_support_ticket_user_ack_sync,
        folio=folio,
        name=name,
        user_email=email,
        category_title=category_title,
        subject=subject,
        description=description,
    )

    return SupportTicketResponse(
        folio=folio,
        message="Tu solicitud de asistencia ha sido registrada con éxito. Te responderemos en un plazo de 12 a 24 horas hábiles.",
        status="received",
    )


