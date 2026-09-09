"""Endpoints de administración para gestión de tickets de soporte y mesa de ayuda."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentAdmin, DatabaseSession
from app.models.entities import SupportTicket, User
from app.services.email_service import send_support_ticket_reply_sync

router = APIRouter()


class AdminSupportTicketItem(BaseModel):
    id: int
    folio: str
    name: str
    full_name: str
    email: str
    mail: str
    user_role: str
    category: str
    category_title: str
    subject: str
    description: str
    message: str
    related_folio_or_handle: Optional[str] = None
    attached_file: Optional[str] = None
    images: Optional[list[str]] = None
    is_read: bool
    read: bool
    status: str
    assigned_admin_id: Optional[int] = None
    assigned_admin_name: Optional[str] = None
    admin_notes: Optional[str] = None
    reply_message: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: datetime
    date: datetime
    updated_at: Optional[datetime] = None
    total: Optional[int] = None
    read_count: Optional[int] = None


class AdminSupportTicketListResponse(BaseModel):
    code: int = 200
    message: str = "Tickets obtenidos con éxito"
    result: list[AdminSupportTicketItem]
    total: int = 0
    read_count: int = 0
    unread_count: int = 0


class AdminSupportTicketReadUpdate(BaseModel):
    is_read: bool = True


class AdminSupportTicketStatusUpdate(BaseModel):
    status: str = Field(description="'open', 'in_progress', 'resolved', 'closed'")
    admin_notes: Optional[str] = None


class AdminSupportTicketReplyPayload(BaseModel):
    reply_message: str = Field(min_length=5, max_length=5000, description="Cuerpo del mensaje de respuesta al usuario")
    admin_notes: Optional[str] = Field(default=None, max_length=2000)


def _to_ticket_item(
    t: SupportTicket,
    total: Optional[int] = None,
    read_count: Optional[int] = None,
) -> AdminSupportTicketItem:
    assigned_name = None
    if t.assigned_admin_id:
        admin_obj = t.__dict__.get("assigned_admin")
        if admin_obj and hasattr(admin_obj, "full_name"):
            assigned_name = admin_obj.full_name

    images_list = [t.attached_file] if t.attached_file else None

    return AdminSupportTicketItem(
        id=t.id,
        folio=t.folio,
        name=t.name,
        full_name=t.name,
        email=t.email,
        mail=t.email,
        user_role=t.user_role,
        category=t.category,
        category_title=t.category_title,
        subject=t.subject,
        description=t.description,
        message=t.description,
        related_folio_or_handle=t.related_folio_or_handle,
        attached_file=t.attached_file,
        images=images_list,
        is_read=bool(t.is_read),
        read=bool(t.is_read),
        status=t.status,
        assigned_admin_id=t.assigned_admin_id,
        assigned_admin_name=assigned_name,
        admin_notes=t.admin_notes,
        reply_message=t.reply_message,
        replied_at=t.replied_at,
        created_at=t.created_at,
        date=t.created_at,
        updated_at=t.updated_at,
        total=total,
        read_count=read_count,
    )


@router.get("", response_model=AdminSupportTicketListResponse)
async def list_support_tickets(
    session: DatabaseSession,
    current_admin: CurrentAdmin,
    last_id: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    read_filter: Optional[str] = Query(None, description="'read', 'unread'"),
    status_filter: Optional[str] = Query(None, description="'open', 'in_progress', 'resolved', 'closed'"),
    role_filter: Optional[str] = Query(None),
    category_filter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
) -> AdminSupportTicketListResponse:
    """Lista tickets de soporte con paginación cursor, búsqueda y filtros avanzados."""
    # Conteos globales
    total_res = await session.execute(select(func.count(SupportTicket.id)))
    total = total_res.scalar() or 0

    read_res = await session.execute(
        select(func.count(SupportTicket.id)).where(SupportTicket.is_read.is_(True))
    )
    read_count = read_res.scalar() or 0
    unread_count = max(0, total - read_count)

    # Consulta filtrada
    query = (
        select(SupportTicket)
        .options(selectinload(SupportTicket.assigned_admin))
        .order_by(SupportTicket.id.desc())
    )

    if last_id > 0:
        query = query.where(SupportTicket.id < last_id)

    if read_filter == "unread":
        query = query.where(SupportTicket.is_read.is_(False))
    elif read_filter == "read":
        query = query.where(SupportTicket.is_read.is_(True))

    if status_filter:
        query = query.where(SupportTicket.status == status_filter)

    if role_filter:
        query = query.where(SupportTicket.user_role == role_filter)

    if category_filter:
        query = query.where(SupportTicket.category == category_filter)

    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                SupportTicket.folio.ilike(s),
                SupportTicket.name.ilike(s),
                SupportTicket.email.ilike(s),
                SupportTicket.subject.ilike(s),
                SupportTicket.description.ilike(s),
                SupportTicket.related_folio_or_handle.ilike(s),
            )
        )

    query = query.limit(limit)
    res = await session.execute(query)
    tickets = res.scalars().all()

    items = [_to_ticket_item(t, total=total, read_count=read_count) for t in tickets]
    return AdminSupportTicketListResponse(
        code=200,
        message="Tickets obtenidos con éxito",
        result=items,
        total=total,
        read_count=read_count,
        unread_count=unread_count,
    )


@router.get("/{id}", response_model=AdminSupportTicketListResponse)
async def get_support_ticket(
    id: int,
    session: DatabaseSession,
    current_admin: CurrentAdmin,
) -> AdminSupportTicketListResponse:
    """Obtiene un ticket por ID y lo marca como leído automáticamente."""
    query = (
        select(SupportTicket)
        .options(selectinload(SupportTicket.assigned_admin))
        .where(SupportTicket.id == id)
    )
    res = await session.execute(query)
    ticket = res.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{id} no encontrado.",
        )

    if not ticket.is_read:
        ticket.is_read = True
        await session.commit()
        await session.refresh(ticket)

    total_res = await session.execute(select(func.count(SupportTicket.id)))
    total = total_res.scalar() or 0

    read_res = await session.execute(
        select(func.count(SupportTicket.id)).where(SupportTicket.is_read.is_(True))
    )
    read_count = read_res.scalar() or 0

    item = _to_ticket_item(ticket, total=total, read_count=read_count)
    return AdminSupportTicketListResponse(
        code=200,
        message="Ticket obtenido con éxito",
        result=[item],
        total=total,
        read_count=read_count,
        unread_count=max(0, total - read_count),
    )


@router.patch("/{id}/read")
async def toggle_support_ticket_read(
    id: int,
    payload: AdminSupportTicketReadUpdate,
    session: DatabaseSession,
    current_admin: CurrentAdmin,
):
    """Actualiza el estado de lectura de un ticket de soporte."""
    query = (
        select(SupportTicket)
        .options(selectinload(SupportTicket.assigned_admin))
        .where(SupportTicket.id == id)
    )
    res = await session.execute(query)
    ticket = res.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{id} no encontrado.",
        )

    ticket.is_read = payload.is_read
    await session.commit()
    await session.refresh(ticket)

    return {
        "message": f"Ticket #{ticket.id} actualizado.",
        "result": [_to_ticket_item(ticket)],
    }


@router.patch("/{id}/status")
async def update_support_ticket_status(
    id: int,
    payload: AdminSupportTicketStatusUpdate,
    session: DatabaseSession,
    current_admin: CurrentAdmin,
):
    """Actualiza el estado del ticket (open, in_progress, resolved, closed) y notas internas."""
    query = (
        select(SupportTicket)
        .options(selectinload(SupportTicket.assigned_admin))
        .where(SupportTicket.id == id)
    )
    res = await session.execute(query)
    ticket = res.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{id} no encontrado.",
        )

    valid_statuses = {"open", "in_progress", "resolved", "closed"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Estado inválido. Debe ser uno de: {', '.join(valid_statuses)}",
        )

    ticket.status = payload.status
    if payload.admin_notes is not None:
        ticket.admin_notes = payload.admin_notes

    if not ticket.assigned_admin_id:
        ticket.assigned_admin_id = current_admin.id

    await session.commit()
    await session.refresh(ticket)

    return {
        "message": f"Estado del ticket #{ticket.id} actualizado a {ticket.status}.",
        "result": [_to_ticket_item(ticket)],
    }


@router.post("/{id}/reply")
async def reply_support_ticket(
    id: int,
    payload: AdminSupportTicketReplyPayload,
    background_tasks: BackgroundTasks,
    session: DatabaseSession,
    current_admin: CurrentAdmin,
):
    """Envía una respuesta oficial al usuario solicitante por email y marca el ticket como resuelto."""
    query = (
        select(SupportTicket)
        .options(selectinload(SupportTicket.assigned_admin))
        .where(SupportTicket.id == id)
    )
    res = await session.execute(query)
    ticket = res.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticket #{id} no encontrado.",
        )

    clean_reply = payload.reply_message.strip()
    if not clean_reply:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El mensaje de respuesta no puede estar vacío.",
        )

    now = datetime.now(timezone.utc)
    ticket.reply_message = clean_reply
    ticket.replied_at = now
    ticket.status = "resolved"
    ticket.is_read = True
    ticket.assigned_admin_id = current_admin.id

    if payload.admin_notes is not None:
        ticket.admin_notes = payload.admin_notes

    await session.commit()
    await session.refresh(ticket)

    admin_display_name = getattr(current_admin, "full_name", None) or "Soporte Buymeashake"

    background_tasks.add_task(
        send_support_ticket_reply_sync,
        folio=ticket.folio,
        name=ticket.name,
        user_email=ticket.email,
        subject=ticket.subject,
        reply_message=clean_reply,
        admin_name=admin_display_name,
    )

    return {
        "folio": ticket.folio,
        "status": ticket.status,
        "email_sent": True,
        "message": f"Respuesta enviada con éxito a {ticket.email} para el ticket {ticket.folio}.",
        "result": [_to_ticket_item(ticket)],
    }
