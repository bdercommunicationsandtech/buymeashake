"""Endpoints de administración para gestión y resolución de reportes de cumplimiento (Trust & Safety)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentAdmin, DatabaseSession
from app.models.entities import AthleteProfile, ComplianceReport, User
from app.services.email_service import send_report_verdict_sync

router = APIRouter()


class AdminComplianceReportItem(BaseModel):
    id: int
    folio: str
    creator_target: str
    athlete_id: Optional[int] = None
    athlete_handle: Optional[str] = None
    athlete_name: Optional[str] = None
    athlete_avatar: Optional[str] = None
    reporter_email: str
    reason_code: str
    reason_title: str
    description: str
    evidence_links: Optional[list[str]] = None
    attached_file: Optional[str] = None
    status: str
    priority: str
    assigned_moderator_id: Optional[int] = None
    assigned_moderator_name: Optional[str] = None
    verdict: Optional[str] = None
    verdict_title: Optional[str] = None
    admin_notes: Optional[str] = None
    action_details: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class AdminComplianceReportListResponse(BaseModel):
    message: str = "Reportes obtenidos con éxito"
    result: list[AdminComplianceReportItem]
    total: int
    pending_count: int = 0


class AdminComplianceStatusUpdate(BaseModel):
    status: str = Field(description="pending, under_review, resolved, dismissed")
    priority: Optional[str] = None
    admin_notes: Optional[str] = None


class AdminReportVerdictPayload(BaseModel):
    reporter_email: Optional[EmailStr] = None
    creator_target: Optional[str] = None
    verdict: str = Field(
        pattern="^(action_taken|dismissed|warning)$",
        description="Resultado: 'action_taken' (sanción), 'dismissed' (desestimado), 'warning' (advertencia)",
    )
    verdict_title: str = Field(min_length=3, max_length=200)
    admin_notes: str = Field(min_length=5, max_length=4000)
    action_details: Optional[str] = Field(default=None, max_length=1000)


class AdminReportVerdictResponse(BaseModel):
    folio: str
    verdict: str
    status: str = "resolved"
    email_sent: bool = True
    message: str


def _to_report_item(r: ComplianceReport) -> AdminComplianceReportItem:
    athlete_handle = None
    athlete_name = None
    athlete_avatar = None
    if r.athlete:
        athlete_handle = r.athlete.handle
        # Inspeccionar __dict__ para evitar lazy load síncrono en contexto async
        athlete_user = r.athlete.__dict__.get("user")
        if athlete_user:
            athlete_name = athlete_user.full_name
            athlete_avatar = athlete_user.avatar_url

    moderator_name = None
    moderator_user = r.__dict__.get("assigned_moderator")
    if moderator_user:
        moderator_name = moderator_user.full_name or moderator_user.email

    return AdminComplianceReportItem(
        id=r.id,
        folio=r.folio,
        creator_target=r.creator_target,
        athlete_id=r.athlete_id,
        athlete_handle=athlete_handle,
        athlete_name=athlete_name,
        athlete_avatar=athlete_avatar,
        reporter_email=r.reporter_email,
        reason_code=r.reason_code,
        reason_title=r.reason_title,
        description=r.description,
        evidence_links=r.evidence_links or [],
        attached_file=r.attached_file,
        status=r.status,
        priority=r.priority,
        assigned_moderator_id=r.assigned_moderator_id,
        assigned_moderator_name=moderator_name,
        verdict=r.verdict,
        verdict_title=r.verdict_title,
        admin_notes=r.admin_notes,
        action_details=r.action_details,
        created_at=r.created_at,
        resolved_at=r.resolved_at,
    )


@router.get("/admin/compliance/reports", response_model=AdminComplianceReportListResponse)
async def list_compliance_reports(
    _admin: CurrentAdmin,
    session: DatabaseSession,
    status_filter: Optional[str] = Query(None, description="pending, under_review, resolved, dismissed, all"),
    priority_filter: Optional[str] = Query(None, description="low, medium, high, critical, all"),
    search: Optional[str] = Query(None, description="Buscar por folio, handle o motivo"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> AdminComplianceReportListResponse:
    """Lista paginada de denuncias para la cola de moderación del admin."""
    query = (
        select(ComplianceReport)
        .options(
            selectinload(ComplianceReport.athlete).selectinload(AthleteProfile.user),
            selectinload(ComplianceReport.assigned_moderator),
        )
    )
    count_query = select(func.count(ComplianceReport.id))

    # Filtro por estado
    normalized_status = (status_filter or "").strip().lower()
    if normalized_status and normalized_status != "all":
        query = query.where(func.lower(ComplianceReport.status) == normalized_status)
        count_query = count_query.where(func.lower(ComplianceReport.status) == normalized_status)

    # Filtro por prioridad
    normalized_priority = (priority_filter or "").strip().lower()
    if normalized_priority and normalized_priority != "all":
        query = query.where(func.lower(ComplianceReport.priority) == normalized_priority)
        count_query = count_query.where(func.lower(ComplianceReport.priority) == normalized_priority)

    # Búsqueda por texto libre
    if search and search.strip():
        term = f"%{search.strip()}%"
        search_pred = or_(
            ComplianceReport.folio.ilike(term),
            ComplianceReport.creator_target.ilike(term),
            ComplianceReport.reporter_email.ilike(term),
            ComplianceReport.reason_title.ilike(term),
            ComplianceReport.reason_code.ilike(term),
        )
        query = query.where(search_pred)
        count_query = count_query.where(search_pred)

    # Conteo total filtrado
    total_res = await session.execute(count_query)
    total_count = total_res.scalar() or 0

    # Conteo de pendientes global para insignia
    pending_res = await session.execute(
        select(func.count(ComplianceReport.id)).where(ComplianceReport.status == "pending")
    )
    pending_count = pending_res.scalar() or 0

    # Ordenar por fecha descendente
    query = query.order_by(ComplianceReport.created_at.desc(), ComplianceReport.id.desc()).offset(offset).limit(limit)
    rows_res = await session.execute(query)
    records = rows_res.scalars().all()

    items = [_to_report_item(r) for r in records]

    return AdminComplianceReportListResponse(
        message="Reportes obtenidos con éxito",
        result=items,
        total=total_count,
        pending_count=pending_count,
    )


@router.get("/admin/compliance/reports/{identifier}", response_model=AdminComplianceReportItem)
async def get_compliance_report(
    identifier: str,
    _admin: CurrentAdmin,
    session: DatabaseSession,
) -> AdminComplianceReportItem:
    """Obtiene el detalle completo de un reporte por ID numérico o folio."""
    query = (
        select(ComplianceReport)
        .options(
            selectinload(ComplianceReport.athlete).selectinload(AthleteProfile.user),
            selectinload(ComplianceReport.assigned_moderator),
        )
    )
    if identifier.isdigit():
        query = query.where(ComplianceReport.id == int(identifier))
    else:
        clean_folio = identifier.strip()
        query = query.where(ComplianceReport.folio == clean_folio)

    result = await session.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    return _to_report_item(report)


@router.patch("/admin/compliance/reports/{identifier}/status")
async def update_report_status(
    identifier: str,
    payload: AdminComplianceStatusUpdate,
    _admin: CurrentAdmin,
    session: DatabaseSession,
) -> AdminComplianceReportItem:
    """Actualiza el estado del reporte en la cola (ej. pasar a 'under_review') y asigna moderador."""
    query = select(ComplianceReport).options(
        selectinload(ComplianceReport.athlete).selectinload(AthleteProfile.user),
        selectinload(ComplianceReport.assigned_moderator),
    )
    if identifier.isdigit():
        query = query.where(ComplianceReport.id == int(identifier))
    else:
        clean_folio = identifier.strip()
        query = query.where(ComplianceReport.folio == clean_folio)

    result = await session.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    new_status = payload.status.strip().lower()
    valid_statuses = {"pending", "under_review", "resolved", "dismissed"}
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inválido. Opciones: {', '.join(valid_statuses)}",
        )

    report.status = new_status
    if payload.priority:
        report.priority = payload.priority.strip().lower()
    if payload.admin_notes:
        report.admin_notes = payload.admin_notes.strip()

    # Si se pasa a revisión o resolución y no tiene moderador, asignar el admin actual
    if new_status in {"under_review", "resolved", "dismissed"}:
        report.assigned_moderator_id = _admin.id

    if new_status in {"resolved", "dismissed"}:
        report.resolved_at = datetime.now(timezone.utc)

    await session.commit()
    await session.refresh(report)

    return _to_report_item(report)


@router.post("/admin/compliance/reports/{identifier}/verdict", response_model=AdminReportVerdictResponse)
async def submit_admin_report_verdict(
    identifier: str,
    payload: AdminReportVerdictPayload,
    background_tasks: BackgroundTasks,
    _admin: CurrentAdmin,
    session: DatabaseSession,
) -> AdminReportVerdictResponse:
    """Aplica el veredicto formal al reporte en base de datos y despacha el correo de resolución."""
    query = select(ComplianceReport).options(
        selectinload(ComplianceReport.athlete).selectinload(AthleteProfile.user),
        selectinload(ComplianceReport.assigned_moderator),
    )
    if identifier.isdigit():
        query = query.where(ComplianceReport.id == int(identifier))
    else:
        clean_folio = identifier.strip()
        query = query.where(ComplianceReport.folio == clean_folio)

    result = await session.execute(query)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")

    # Actualizar entidad
    report.status = "resolved"
    report.verdict = payload.verdict
    report.verdict_title = payload.verdict_title
    report.admin_notes = payload.admin_notes
    report.action_details = payload.action_details
    report.assigned_moderator_id = _admin.id
    report.resolved_at = datetime.now(timezone.utc)

    await session.commit()

    # Enviar correo de resolución
    to_email = payload.reporter_email or report.reporter_email
    creator_target = payload.creator_target or report.creator_target

    clean_folio = report.folio
    if not clean_folio.startswith("#"):
        clean_folio = f"#{clean_folio}"

    background_tasks.add_task(
        send_report_verdict_sync,
        to_email=to_email,
        folio=clean_folio,
        creator_target=creator_target,
        verdict=payload.verdict,
        verdict_title=payload.verdict_title,
        admin_notes=payload.admin_notes,
        action_details=payload.action_details,
    )

    return AdminReportVerdictResponse(
        folio=report.folio,
        verdict=payload.verdict,
        status="resolved",
        email_sent=True,
        message=f"Dictamen del reporte {report.folio} procesado y enviado con éxito.",
    )
