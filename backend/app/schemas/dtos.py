from datetime import datetime, time
from decimal import Decimal
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, EmailStr, Field


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==============================================================================
# 1. AUTH & USUARIOS
# ==============================================================================

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Mínimo 8 caracteres")
    full_name: str = Field(min_length=2, max_length=150)
    role: str = Field(default="supporter", pattern="^(supporter|athlete)$")
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


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    avatar_url: str | None
    role: str
    is_email_verified: bool
    athlete_handle: str | None = None
    referral_code: str | None = None


# ==============================================================================
# 2. LOOKUPS & APP VERSION
# ==============================================================================

class LookupItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: int
    label: str
    icon: str | None
    sort_order: int
    metadata_: dict[str, Any] | None = Field(default=None, alias="metadata")


class LookupGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: int
    name: str
    description: str | None
    items: list[LookupItemResponse]


class AppVersionCheckResponse(BaseModel):
    update_required: bool
    force_update: bool
    latest_version: str
    min_supported_version: int
    store_url: str | None
    release_notes: str | None


# ==============================================================================
# 3. EXPLORE & CREADORES
# ==============================================================================

class AthleteLeaderboardItemResponse(BaseModel):
    athlete_id: int
    handle: str
    athlete_name: str
    avatar_url: str | None
    primary_sport: str
    total_shakes_this_month: int
    total_raised_this_month: Decimal
    ranking_position: int


class CreatorBookingServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    duration_minutes: int
    price: Decimal
    currency: str
    platform: str


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
    booking_services: list[CreatorBookingServiceResponse] = []


# ==============================================================================
# 4. CHECKOUT & RESERVAS CALENDLY
# ==============================================================================

class ShakeCheckoutCreateRequest(BaseModel):
    athlete_handle: str
    shakes_count: int = Field(ge=1, le=100, default=3)
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")
    supporter_message: str | None = Field(default=None, max_length=240)
    is_anonymous: bool = False


class BookingSessionCheckoutRequest(BaseModel):
    booking_service_id: int
    start_time: datetime
    end_time: datetime
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")
    notes: str | None = None


class PaymentIntentResponse(BaseModel):
    client_secret: str
    transaction_uuid: str
    gross_amount: Decimal
    currency: str


# ==============================================================================
# 5. DASHBOARD DEL ATLETA (DTOs)
# ==============================================================================

class DashboardMetricsResponse(BaseModel):
    total_earnings_30d: Decimal
    total_shakes_30d: int
    active_members_count: int
    monthly_recurring_revenue: Decimal
    earnings_by_type: dict[str, Decimal]  # {"shakes": 120.0, "memberships": 450.0, "shop": 80.0, "bookings": 150.0}
    currency: str = "USD"


# Membresías (Tiers)
class TierBenefitDto(BaseModel):
    benefit_text: str


class MembershipTierCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = None
    monthly_price: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")
    benefits: list[str] = []


class MembershipTierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    monthly_price: Decimal
    currency: str
    is_active: bool
    benefits: list[str] = []
    members_count: int = 0


# Tienda Digital (Products)
class DigitalProductCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    price: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")
    file_type: str = Field(pattern="^(PDF|Video_Link|Template_Notion|Zip)$")
    file_url: str


class DigitalProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    price: Decimal
    currency: str
    file_type: str
    file_url: str
    is_active: bool


# Asesorías 1-a-1 & Disponibilidad (Bookings)
class AvailabilitySlotDto(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="0=Domingo, 1=Lunes, ..., 6=Sábado")
    start_time: time
    end_time: time


class BookingServiceCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    duration_minutes: int = Field(default=45, ge=15, le=180)
    price: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")
    platform: str = Field(default="google_meet", pattern="^(google_meet|zoom|whatsapp_video)$")
    availabilities: list[AvailabilitySlotDto] = []


class BookingServiceFullResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    duration_minutes: int
    price: Decimal
    currency: str
    platform: str
    is_active: bool


class BookingAppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supporter_name: str
    service_title: str
    start_time: datetime
    end_time: datetime
    meeting_link: str | None
    status_code: int


# Referidos
class ReferredAthleteItemResponse(BaseModel):
    name: str
    handle: str
    joined_date: datetime
    shakes_count: int
    earned_commission: Decimal
    status: str


class ReferralDashboardResponse(BaseModel):
    referral_link: str
    invited_athletes_count: int
    active_athletes_count: int
    total_shakes_generated: int
    total_earned_commission: Decimal
    referred_athletes: list[ReferredAthleteItemResponse]


# Perfil & Configuración de Atleta
class AthleteProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    bio: str | None = Field(default=None, max_length=1000)
    city: str | None = Field(default=None, max_length=100)
    primary_sport_code: int | None = None
    shake_price: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, pattern="^(USD|MXN)$")
    avatar_url: str | None = None
    cover_image_url: str | None = None
    google_analytics_id: str | None = None


class AthleteProfileFullResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    handle: str
    full_name: str
    email: str
    bio: str | None
    city: str | None
    primary_sport_code: int | None
    shake_price: Decimal
    currency: str
    avatar_url: str | None
    cover_image_url: str | None
    is_verified: bool
    referral_code: str


# Metas Deportivas (Goals)
class GoalCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    target_amount: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    target_amount: Decimal
    raised_amount: Decimal
    currency: str
    is_active: bool
    achieved_at: datetime | None
    created_at: datetime


# Subida de Archivos (Uploads)
class UploadFileResponse(BaseModel):
    url: str
    filename: str
    content_type: str
    size_bytes: int


