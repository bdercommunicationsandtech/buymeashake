from datetime import datetime
from decimal import Decimal
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ----------------------------------------------------------------------
# Base Envelope & Paginación
# ----------------------------------------------------------------------
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ----------------------------------------------------------------------
# Auth & User Schemas
# ----------------------------------------------------------------------
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Mínimo 8 caracteres")
    full_name: str = Field(min_length=2, max_length=150)
    role: str = Field(default="supporter", pattern="^(supporter|athlete)$")
    # Campos opcionales requeridos si se registra como atleta
    handle: str | None = Field(default=None, pattern="^[a-z0-9_]{3,30}$")
    primary_sport_code: int | None = Field(default=None)
    referral_code: str | None = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    avatar_url: str | None
    role: str
    is_email_verified: bool
    athlete_handle: str | None = None


# ----------------------------------------------------------------------
# Explore & Creators Schemas
# ----------------------------------------------------------------------
class AthleteLeaderboardItemResponse(BaseModel):
    athlete_id: int
    handle: str
    athlete_name: str
    avatar_url: str | None
    primary_sport: str
    total_shakes_this_month: int
    total_raised_this_month: Decimal
    ranking_position: int


class CreatorPublicProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    handle: str
    name: str
    bio: str | None
    primary_sport: str
    city: str | None
    avatar_url: str | None
    cover_image_url: str | None
    shake_price: Decimal
    currency: str
    is_verified: bool
    active_goal_title: str | None = None
    active_goal_target: Decimal | None = None
    active_goal_raised: Decimal | None = None


# ----------------------------------------------------------------------
# Checkout & Stripe Schemas
# ----------------------------------------------------------------------
class ShakeCheckoutCreateRequest(BaseModel):
    athlete_handle: str
    shakes_count: int = Field(ge=1, le=100, default=3)
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")
    supporter_message: str | None = Field(default=None, max_length=240)
    is_anonymous: bool = False


class PaymentIntentResponse(BaseModel):
    client_secret: str
    transaction_uuid: str
    gross_amount: Decimal
    currency: str


# ----------------------------------------------------------------------
# Lookups & App Version Schemas
# ----------------------------------------------------------------------
class LookupItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: int
    label: str
    icon: str | None
    sort_order: int
    metadata: dict[str, Any] | None = None


class LookupGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: int
    name: str
    items: list[LookupItemResponse]


class AppVersionCheckResponse(BaseModel):
    update_required: bool
    force_update: bool
    latest_version: str
    min_supported_version: int
    store_url: str | None
    release_notes: str | None
