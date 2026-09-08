from datetime import datetime, time
from decimal import Decimal
from typing import Any, Generic, TypeVar
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, EmailStr, Field, ValidationInfo, field_validator

from app.core.allowed_user_text import (
    validate_allowed_user_text,
    validate_required_allowed_user_text,
)
from app.core.html_sanitize import sanitize_post_html


T = TypeVar("T")

_SOCIAL_HOST_HINTS: dict[str, tuple[str, ...]] = {
    "instagram_url": ("instagram.com", "www.instagram.com"),
    "tiktok_url": ("tiktok.com", "www.tiktok.com", "vm.tiktok.com"),
    "facebook_url": ("facebook.com", "www.facebook.com", "fb.com", "www.fb.com", "m.facebook.com"),
    "twitter_url": ("twitter.com", "www.twitter.com", "x.com", "www.x.com"),
}


def _normalize_social_url(value: str | None, field_name: str) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if not cleaned.startswith(("http://", "https://")):
        cleaned = f"https://{cleaned.lstrip('/')}"
    parsed = urlparse(cleaned)
    host = (parsed.hostname or "").lower()
    if not host:
        label = field_name.replace("_url", "").replace("_", " ")
        raise ValueError(f"URL inválida para {label}. Usa un enlace completo de la red social.")
    allowed = _SOCIAL_HOST_HINTS.get(field_name, ())
    if allowed and host not in allowed and not any(host.endswith(f".{h.removeprefix('www.')}") for h in allowed):
        base_allowed = {h.removeprefix("www.") for h in allowed}
        if not any(host == b or host.endswith(f".{b}") for b in base_allowed):
            label = field_name.replace("_url", "").replace("_", " ")
            examples = {
                "instagram_url": "https://instagram.com/tu_usuario",
                "tiktok_url": "https://tiktok.com/@tu_usuario",
                "facebook_url": "https://facebook.com/tu_pagina",
                "twitter_url": "https://x.com/tu_usuario",
            }
            example = examples.get(field_name, "https://...")
            raise ValueError(f"URL inválida para {label}. Ejemplo: {example}")
    return cleaned[:255]


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
    email: EmailStr = Field(max_length=191)
    password: str = Field(min_length=8, max_length=128, description="Mínimo 8 caracteres")
    full_name: str = Field(min_length=2, max_length=150)
    role: str = Field(default="supporter", pattern="^(supporter|athlete)$")
    handle: str | None = Field(default=None, pattern="^[a-z0-9_]{3,30}$")
    primary_sport_code: int | None = Field(default=None)
    referral_code: str | None = Field(default=None, max_length=50)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(max_length=191)
    password: str = Field(max_length=128)


class RequestOtpRequest(BaseModel):
    email: EmailStr = Field(max_length=191)
    name: str | None = Field(default=None, max_length=150)
    athlete_handle: str | None = Field(default=None, max_length=50)

    @field_validator("name", mode="before")
    @classmethod
    def validate_otp_name_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)


class VerifyOtpRequest(BaseModel):
    email: EmailStr = Field(max_length=191)
    code: str = Field(min_length=4, max_length=10)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    password: str | None = Field(default=None, min_length=8, max_length=128)
    avatar_url: str | None = Field(default=None, max_length=255)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_profile_name_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)

class RequestOtpResponse(BaseModel):
    message: str
    expires_in_seconds: int = 900
    demo_code: str | None = None


class FollowedAthleteResponse(BaseModel):
    id: int
    name: str
    handle: str
    avatar_url: str | None = None
    bio: str | None = None
    primary_sport: str | None = None


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
    bio: str | None = None
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


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: str
    type_code: int
    action_url: str | None = None
    is_read: bool
    created_at: datetime


class CreatorPublicProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    handle: str
    name: str
    bio: str | None
    page_title: str | None = None
    page_description: str | None = None
    agenda_title: str | None = None
    agenda_description: str | None = None
    agenda_image_url: str | None = None
    primary_sport: str
    city: str | None
    avatar_url: str | None
    cover_image_url: str | None
    instagram_url: str | None = None
    tiktok_url: str | None = None
    facebook_url: str | None = None
    twitter_url: str | None = None
    shake_price: Decimal
    currency: str
    is_verified: bool
    active_goal_title: str | None = None
    active_goal_target: Decimal | None = None
    active_goal_raised: Decimal | None = None
    active_goal_cover_image_url: str | None = None
    booking_services: list[CreatorBookingServiceResponse] = []
    tiers: list["MembershipTierResponse"] = []
    products: list["DigitalProductResponse"] = []
    recent_supporters: list["SupporterItemResponse"] = []
    total_shakes_received: int = 0
    followers_count: int = 0
    members_count: int = 0


# ==============================================================================
# 4. CHECKOUT & RESERVAS CALENDLY
# ==============================================================================

class ShakeDetailsRequest(BaseModel):
    shakes_count: int = Field(ge=1, le=100, default=3)
    supporter_message: str | None = Field(default=None, max_length=240)
    is_anonymous: bool = False

    @field_validator("supporter_message", mode="before")
    @classmethod
    def validate_supporter_message_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)


class ShakeCheckoutCreateRequest(BaseModel):
    athlete_handle: str
    currency: str = Field(default="USD", pattern="^(USD|MXN)$")
    supporter_name: str | None = Field(default=None, max_length=150)
    supporter_email: str | None = Field(default=None, max_length=191)
    shake_details: ShakeDetailsRequest = Field(default_factory=ShakeDetailsRequest)

    @field_validator("supporter_name", mode="before")
    @classmethod
    def validate_supporter_name_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)


class BookingSessionCheckoutRequest(BaseModel):
    booking_service_id: int
    start_time: datetime
    end_time: datetime
    currency: str = Field(default="USD", pattern="^USD$")
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("notes", mode="before")
    @classmethod
    def validate_notes_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)

class PaymentIntentResponse(BaseModel):
    client_secret: str
    transaction_uuid: str
    gross_amount: Decimal
    currency: str


class StripeCheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str
    transaction_uuid: str


class StripeConnectLinkResponse(BaseModel):
    account_link_url: str
    stripe_connect_account_id: str


class StripeConnectStatusResponse(BaseModel):
    stripe_connect_account_id: str | None = None
    payouts_enabled: bool = False
    details_submitted: bool = False
    charges_enabled: bool = False
    requirements_due: list[str] = []


class SubscriptionCheckoutRequest(BaseModel):
    tier_id: int
    supporter_email: str | None = Field(default=None, max_length=191)
    supporter_name: str | None = Field(default=None, max_length=150)

    @field_validator("supporter_name", mode="before")
    @classmethod
    def validate_sub_supporter_name_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)


class CustomerPortalResponse(BaseModel):
    portal_url: str



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
    description: str | None = Field(default=None, max_length=2000)
    monthly_price: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^USD$")
    benefits: list[str] = []

    @field_validator("name", mode="before")
    @classmethod
    def validate_tier_name_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)

    @field_validator("description", mode="before")
    @classmethod
    def validate_tier_description_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)

    @field_validator("benefits", mode="before")
    @classmethod
    def validate_tier_benefits_chars(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("benefits debe ser una lista")
        cleaned: list[str] = []
        for item in value:
            text = validate_allowed_user_text(item)
            if text:
                if len(text) > 255:
                    raise ValueError("Cada beneficio no puede superar 255 caracteres")
                cleaned.append(text)
        return cleaned


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
    description: str | None = Field(default=None, max_length=2000)
    price: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^USD$")
    file_type: str = Field(pattern="^(PDF|Video_Link|Template_Notion|Zip)$")
    file_url: str = Field(max_length=255)

    @field_validator("title", mode="before")
    @classmethod
    def validate_product_title_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)

    @field_validator("description", mode="before")
    @classmethod
    def validate_product_description_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)

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
    description: str | None = Field(default=None, max_length=2000)
    duration_minutes: int = Field(default=45, ge=15, le=180)
    price: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^USD$")
    platform: str = Field(default="google_meet", pattern="^(google_meet|zoom|whatsapp_video)$")
    availabilities: list[AvailabilitySlotDto] = []

    @field_validator("title", mode="before")
    @classmethod
    def validate_booking_title_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)

    @field_validator("description", mode="before")
    @classmethod
    def validate_booking_description_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)

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
    bio: str | None = Field(default=None, max_length=2000)
    page_title: str | None = Field(default=None, max_length=200)
    page_description: str | None = Field(default=None, max_length=2000)
    agenda_title: str | None = Field(default=None, max_length=200)
    agenda_description: str | None = Field(default=None, max_length=2000)
    agenda_image_url: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    primary_sport_code: int | None = None
    shake_price: Decimal | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, pattern="^USD$")
    avatar_url: str | None = Field(default=None, max_length=255)
    cover_image_url: str | None = Field(default=None, max_length=255)
    google_analytics_id: str | None = Field(default=None, max_length=50)
    instagram_url: str | None = Field(default=None, max_length=255)
    tiktok_url: str | None = Field(default=None, max_length=255)
    facebook_url: str | None = Field(default=None, max_length=255)
    twitter_url: str | None = Field(default=None, max_length=255)
    thank_you_message: str | None = Field(default=None, max_length=1000)

    @field_validator(
        "full_name",
        "bio",
        "page_title",
        "page_description",
        "agenda_title",
        "agenda_description",
        "city",
        "thank_you_message",
        mode="before",
    )
    @classmethod
    def validate_athlete_text_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)

    @field_validator("instagram_url", "tiktok_url", "facebook_url", "twitter_url", mode="before")
    @classmethod
    def validate_social_urls(cls, value: Any, info: ValidationInfo) -> str | None:
        return _normalize_social_url(
            value if value is None or isinstance(value, str) else str(value),
            info.field_name or "",
        )

class AthleteProfileFullResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    handle: str
    full_name: str
    email: str
    bio: str | None
    page_title: str | None = None
    page_description: str | None = None
    agenda_title: str | None = None
    agenda_description: str | None = None
    agenda_image_url: str | None = None
    city: str | None
    primary_sport_code: int | None
    shake_price: Decimal
    currency: str
    avatar_url: str | None
    cover_image_url: str | None
    instagram_url: str | None = None
    tiktok_url: str | None = None
    facebook_url: str | None = None
    twitter_url: str | None = None
    is_verified: bool
    referral_code: str
    thank_you_message: str | None = None


# Metas Deportivas (Goals)
class GoalCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    target_amount: Decimal = Field(gt=0)
    currency: str = Field(default="USD", pattern="^USD$")
    cover_image_url: str | None = None

    @field_validator("title", mode="before")
    @classmethod
    def validate_goal_title_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)


class GoalUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    target_amount: Decimal | None = Field(default=None, gt=0)
    is_active: bool | None = None
    cover_image_url: str | None = None

    @field_validator("title", mode="before")
    @classmethod
    def validate_goal_update_title_chars(cls, value: Any) -> str | None:
        return validate_allowed_user_text(value)

class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    target_amount: Decimal
    raised_amount: Decimal
    currency: str
    is_active: bool
    cover_image_url: str | None = None
    achieved_at: datetime | None
    created_at: datetime


# Subida de Archivos (Uploads)
class UploadFileResponse(BaseModel):
    url: str
    filename: str
    content_type: str
    size_bytes: int


# Publicaciones & Comentarios (Posts & Comments)
class PostCommentCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1000)

    @field_validator("content", mode="before")
    @classmethod
    def validate_comment_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)


class PostCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    user_id: int
    user_name: str
    user_avatar: str | None = None
    content: str
    likes_count: int = 0
    created_at: datetime


class PostCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    content_html: str = Field(min_length=1, max_length=50_000)
    access_type: str = Field(default="public", pattern="^(public|followers_only|members_only)$")

    @field_validator("title", mode="before")
    @classmethod
    def validate_post_title_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)

    @field_validator("content_html", mode="before")
    @classmethod
    def sanitize_content_html(cls, value: Any) -> str:
        return sanitize_post_html(value)


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content_html: str
    access_type: str
    likes_count: int
    published_at: datetime
    is_members_only: bool = False
    author_name: str | None = None
    author_handle: str | None = None
    comments: list[PostCommentResponse] = []


# Supporters (transacciones shake)
class ReplySupporterRequest(BaseModel):
    reply_text: str = Field(min_length=1, max_length=500)

    @field_validator("reply_text", mode="before")
    @classmethod
    def validate_reply_chars(cls, value: Any) -> str:
        return validate_required_allowed_user_text(value)

class ShakeDetailsResponse(BaseModel):
    shakes_count: int
    supporter_message: str | None = None
    is_anonymous: bool = False
    creator_reply: str | None = None
    creator_reply_at: datetime | None = None
    is_liked_by_creator: bool = False


class SupporterItemResponse(BaseModel):
    id: int
    supporter_name: str
    gross_amount: Decimal
    currency: str
    created_at: datetime
    shake_details: ShakeDetailsResponse


class SupportersDashboardResponse(BaseModel):
    supporter_count: int
    last_30_days_total: Decimal
    all_time_total: Decimal
    currency: str = "USD"
    items: list[SupporterItemResponse]

