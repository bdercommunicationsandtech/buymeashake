from datetime import datetime
from decimal import Decimal
from typing import Any
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.dialects.mysql import BIGINT, JSON, LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ==============================================================================
# MÓDULO 0: LOOKUPS & SISTEMA
# ==============================================================================

class LookupGroup(Base):
    __tablename__ = "lookup_groups"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    items: Mapped[list["LookupItem"]] = relationship("LookupItem", back_populates="group", cascade="all, delete-orphan")


class LookupItem(Base):
    __tablename__ = "lookup_items"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    lookup_group_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("lookup_groups.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    group: Mapped[LookupGroup] = relationship("LookupGroup", back_populates="items")


class AppVersion(Base):
    __tablename__ = "app_versions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(Enum("ios", "android", "web", name="app_platform_enum"), nullable=False)
    version_name: Mapped[str] = mapped_column(String(20), nullable=False)
    version_code: Mapped[int] = mapped_column(Integer, nullable=False)
    min_supported_version_code: Mapped[int] = mapped_column(Integer, nullable=False)
    force_update: Mapped[bool] = mapped_column(Boolean, default=False)
    update_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    release_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    released_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# ==============================================================================
# MÓDULO 1: USUARIOS Y ATLETAS
# ==============================================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(191), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(Enum("supporter", "athlete", "admin", name="user_role_enum"), default="supporter")
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete_profile: Mapped["AthleteProfile | None"] = relationship("AthleteProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    handle: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    primary_sport_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tiktok_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    facebook_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    twitter_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shake_price: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("3.00"))
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="currency_enum"), default="USD")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_nsfw: Mapped[bool] = mapped_column(Boolean, default=False)
    google_analytics_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    stripe_connect_account_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    payouts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    referred_by_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="SET NULL"), nullable=True)
    referral_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship("User", back_populates="athlete_profile")
    goals: Mapped[list["Goal"]] = relationship("Goal", back_populates="athlete", cascade="all, delete-orphan")
    tiers: Mapped[list["MembershipTier"]] = relationship("MembershipTier", back_populates="athlete", cascade="all, delete-orphan")
    products: Mapped[list["DigitalProduct"]] = relationship("DigitalProduct", back_populates="athlete", cascade="all, delete-orphan")
    booking_services: Mapped[list["BookingService"]] = relationship("BookingService", back_populates="athlete", cascade="all, delete-orphan")
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="athlete", cascade="all, delete-orphan")


# ==============================================================================
# MÓDULO 2: METAS, MEMBRESÍAS & SUSCRIPCIONES
# ==============================================================================

class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    raised_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"))
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="goal_currency_enum"), default="USD")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    achieved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="goals")


class MembershipTier(Base):
    __tablename__ = "membership_tiers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    monthly_price: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="tier_currency_enum"), default="USD")
    stripe_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="tiers")
    benefits: Mapped[list["TierBenefit"]] = relationship("TierBenefit", back_populates="tier", cascade="all, delete-orphan")


class TierBenefit(Base):
    __tablename__ = "tier_benefits"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    tier_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("membership_tiers.id", ondelete="CASCADE"), nullable=False)
    benefit_text: Mapped[str] = mapped_column(String(255), nullable=False)

    tier: Mapped[MembershipTier] = relationship("MembershipTier", back_populates="benefits")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    tier_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("membership_tiers.id", ondelete="RESTRICT"), nullable=False)
    stripe_subscription_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(Enum("active", "past_due", "canceled", "unpaid", name="sub_status_enum"), default="active")
    current_period_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


# ==============================================================================
# MÓDULO 3: TIENDA DIGITAL & ASESORÍAS 1-A-1 (CALENDLY)
# ==============================================================================

class DigitalProduct(Base):
    __tablename__ = "digital_products"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="product_currency_enum"), default="USD")
    file_type: Mapped[str] = mapped_column(Enum("PDF", "Video_Link", "Template_Notion", "Zip", name="file_type_enum"), nullable=False)
    file_url: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="products")


class BookingService(Base):
    __tablename__ = "booking_services"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=45)
    price: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="booking_currency_enum"), default="USD")
    platform: Mapped[str] = mapped_column(Enum("google_meet", "zoom", "whatsapp_video", name="platform_enum"), default="google_meet")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="booking_services")
    availabilities: Mapped[list["BookingAvailability"]] = relationship("BookingAvailability", back_populates="booking_service", cascade="all, delete-orphan")


class BookingAvailability(Base):
    __tablename__ = "booking_availabilities"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    booking_service_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("booking_services.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 0=Domingo, 1=Lunes, ...
    start_time: Mapped[datetime] = mapped_column(Time, nullable=False)
    end_time: Mapped[datetime] = mapped_column(Time, nullable=False)

    booking_service: Mapped[BookingService] = relationship("BookingService", back_populates="availabilities")


class BookingAppointment(Base):
    __tablename__ = "booking_appointments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    booking_service_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("booking_services.id", ondelete="RESTRICT"), nullable=False)
    supporter_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    transaction_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("transactions.id", ondelete="RESTRICT"), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    meeting_link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status_code: Mapped[int] = mapped_column(Integer, default=302)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ==============================================================================
# MÓDULO 4: TRANSACCIONES (STRIPE)
# ==============================================================================

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    transaction_uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    supporter_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="RESTRICT"), nullable=False)
    goal_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)
    transaction_type_code: Mapped[int] = mapped_column(Integer, default=201, index=True)
    shakes_count: Mapped[int] = mapped_column(Integer, default=1)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="trans_currency_enum"), default="USD")
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    stripe_fee: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    net_athlete_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True)
    stripe_transfer_id: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True)
    status_code: Mapped[int] = mapped_column(Integer, default=301, index=True)
    supporter_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ==============================================================================
# MÓDULO 5: PUBLICACIONES & NOTIFICACIONES
# ==============================================================================

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_html: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    access_type: Mapped[str] = mapped_column(Enum("public", "members_only", name="post_access_enum"), default="public")
    minimum_tier_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("membership_tiers.id", ondelete="SET NULL"), nullable=True)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="posts")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    type_code: Mapped[int] = mapped_column(Integer, default=401)
    action_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ==============================================================================
# MÓDULO 6: SEGUIDORES (FOLLOWS) & VERIFICACIÓN OTP
# ==============================================================================

class AthleteFollow(Base):
    __tablename__ = "athlete_follows"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    supporter_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    athlete_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    supporter: Mapped[User] = relationship("User")
    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile")


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(191), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    purpose: Mapped[str] = mapped_column(String(50), default="supporter_follow")
    metadata_: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSON, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

