from datetime import datetime
from typing import Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()

# Schema definitions
class BannerItem(BaseModel):
    id: int
    title: str | None = None
    description: str | None = None
    title_en: str | None = None
    description_en: str | None = None
    image_url: str
    show_action: bool = False
    action_text: str | None = None
    action_text_en: str | None = None
    action_url: str | None = None
    action_url_mobile: str | None = None
    display_order: int = 0
    status_id: int = 1
    for_user: str | None = None
    platform: str = "all"
    market_mode: str = "general"
    created_date: str = ""
    updated_date: str = ""

class BannerCreatePayload(BaseModel):
    title: str | None = None
    description: str | None = None
    title_en: str | None = None
    description_en: str | None = None
    image_url: str
    show_action: bool = False
    action_text: str | None = None
    action_text_en: str | None = None
    action_url: str | None = None
    action_url_mobile: str | None = None
    display_order: int = 0
    status_id: int = 1
    for_user: str | None = None
    platform: str = "all"
    market_mode: str = "general"

class BannerUpdatePayload(BaseModel):
    title: str | None = None
    description: str | None = None
    title_en: str | None = None
    description_en: str | None = None
    image_url: str | None = None
    show_action: bool | None = None
    action_text: str | None = None
    action_text_en: str | None = None
    action_url: str | None = None
    action_url_mobile: str | None = None
    display_order: int | None = None
    status_id: int | None = None
    for_user: str | None = None
    platform: str | None = None
    market_mode: str | None = None

class ActionCatalogueItem(BaseModel):
    id: int
    name: str
    description: str | None = None
    action_url: str | None = None
    action_url_mobile: str | None = None

class ActionCataloguePayload(BaseModel):
    name: str
    description: str | None = None
    action_url: str | None = None
    action_url_mobile: str | None = None

# In-memory initial state for rapid response and persistence
_BANNERS: list[dict[str, Any]] = [
    {
        "id": 1,
        "title": "Gimnasio & Fuerza",
        "description": "Atmósfera atlética de alto rendimiento",
        "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop",
        "show_action": False,
        "display_order": 1,
        "status_id": 1,
        "platform": "all",
        "market_mode": "general",
        "created_date": datetime.now().isoformat(),
        "updated_date": datetime.now().isoformat(),
    },
    {
        "id": 2,
        "title": "Velocidad & Pista",
        "description": "Sprint al atardecer en pista olímpica",
        "image_url": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2000&auto=format&fit=crop",
        "show_action": False,
        "display_order": 2,
        "status_id": 1,
        "platform": "all",
        "market_mode": "general",
        "created_date": datetime.now().isoformat(),
        "updated_date": datetime.now().isoformat(),
    },
    {
        "id": 3,
        "title": "Ciclismo de Ruta",
        "description": "Entrenamiento de resistencia y ruta",
        "image_url": "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?q=80&w=2000&auto=format&fit=crop",
        "show_action": False,
        "display_order": 3,
        "status_id": 1,
        "platform": "all",
        "market_mode": "general",
        "created_date": datetime.now().isoformat(),
        "updated_date": datetime.now().isoformat(),
    },
    {
        "id": 4,
        "title": "Cross Training & Funcional",
        "description": "Fuerza explosiva con kettlebells",
        "image_url": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=2000&auto=format&fit=crop",
        "show_action": False,
        "display_order": 4,
        "status_id": 1,
        "platform": "all",
        "market_mode": "general",
        "created_date": datetime.now().isoformat(),
        "updated_date": datetime.now().isoformat(),
    },
    {
        "id": 5,
        "title": "Natación & Deportes Acuáticos",
        "description": "Técnica subacuática de alta competencia",
        "image_url": "https://images.unsplash.com/photo-1530549387789-4c1017266635?q=80&w=2000&auto=format&fit=crop",
        "show_action": False,
        "display_order": 5,
        "status_id": 1,
        "platform": "all",
        "market_mode": "general",
        "created_date": datetime.now().isoformat(),
        "updated_date": datetime.now().isoformat(),
    },
]

_ACTIONS: list[dict[str, Any]] = [
    {"id": 1, "name": "Registro Atleta", "description": "Lleva a la pantalla de onboarding de atletas", "action_url": "/auth/register?role=athlete", "action_url_mobile": "/auth/register"},
    {"id": 2, "name": "Explorar Atletas", "description": "Catálogo completo de atletas", "action_url": "/explore", "action_url_mobile": "/explore"},
]

# Public endpoint for Landing Hero
@router.get("/banners", response_model=list[BannerItem])
def get_public_banners():
    """Retorna los banners activos para el hero de la landing page."""
    active = [b for b in _BANNERS if b.get("status_id") == 1]
    return sorted(active, key=lambda x: x.get("display_order", 0))

# Admin endpoints
@router.get("/admin/banners/", response_model=list[BannerItem])
def list_admin_banners():
    return sorted(_BANNERS, key=lambda x: x.get("display_order", 0))

@router.post("/admin/banners/", response_model=BannerItem)
def create_admin_banner(payload: BannerCreatePayload):
    new_id = max([b["id"] for b in _BANNERS], default=0) + 1
    now = datetime.now().isoformat()
    item = payload.model_dump()
    item.update({"id": new_id, "created_date": now, "updated_date": now})
    _BANNERS.append(item)
    return item

@router.put("/admin/banners/{banner_id}", response_model=BannerItem)
def update_admin_banner(banner_id: int, payload: BannerUpdatePayload):
    for b in _BANNERS:
        if b["id"] == banner_id:
            data = payload.model_dump(exclude_unset=True)
            b.update(data)
            b["updated_date"] = datetime.now().isoformat()
            return b
    raise HTTPException(status_code=404, detail="Banner no encontrado")

@router.delete("/admin/banners/{banner_id}")
def deactivate_admin_banner(banner_id: int):
    for b in _BANNERS:
        if b["id"] == banner_id:
            b["status_id"] = 0
            b["updated_date"] = datetime.now().isoformat()
            return {"message": "Banner desactivado correctamente", "id": banner_id}
    raise HTTPException(status_code=404, detail="Banner no encontrado")

@router.get("/admin/banners/actions-catalogue")
def list_actions_catalogue():
    return {"items": _ACTIONS}

@router.post("/admin/banners/actions-catalogue", response_model=ActionCatalogueItem)
def create_action_catalogue(payload: ActionCataloguePayload):
    new_id = max([a["id"] for a in _ACTIONS], default=0) + 1
    item = payload.model_dump()
    item["id"] = new_id
    _ACTIONS.append(item)
    return item

@router.put("/admin/banners/actions-catalogue/{action_id}", response_model=ActionCatalogueItem)
def update_action_catalogue(action_id: int, payload: ActionCataloguePayload):
    for a in _ACTIONS:
        if a["id"] == action_id:
            a.update(payload.model_dump())
            return a
    raise HTTPException(status_code=404, detail="Acción no encontrada")

@router.delete("/admin/banners/actions-catalogue/{action_id}")
def delete_action_catalogue(action_id: int):
    global _ACTIONS
    _ACTIONS = [a for a in _ACTIONS if a["id"] != action_id]
    return {"message": "Acción eliminada", "id": action_id}
