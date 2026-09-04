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
    UniqueConstraint,
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
# MÓDULO 1: USUARIOS Y ATLETAS (NORMALIZADO)
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

    athlete_profile: Mapped["AthleteProfile | None"] = relationship(
        "AthleteProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    handle: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    primary_sport_item_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("lookup_items.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_nsfw: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    user: Mapped[User] = relationship("User", back_populates="athlete_profile")
    primary_sport: Mapped["LookupItem | None"] = relationship("LookupItem", foreign_keys=[primary_sport_item_id])
    page_settings: Mapped["AthletePageSettings | None"] = relationship(
        "AthletePageSettings", back_populates="athlete", uselist=False, cascade="all, delete-orphan"
    )
    social_links: Mapped[list["AthleteSocialLink"]] = relationship(
        "AthleteSocialLink", back_populates="athlete", cascade="all, delete-orphan"
    )
    monetization: Mapped["AthleteMonetization | None"] = relationship(
        "AthleteMonetization", back_populates="athlete", uselist=False, cascade="all, delete-orphan"
    )
    payouts: Mapped["AthletePayouts | None"] = relationship(
        "AthletePayouts", back_populates="athlete", uselist=False, cascade="all, delete-orphan"
    )
    referrals: Mapped["AthleteReferrals | None"] = relationship(
        "AthleteReferrals",
        back_populates="athlete",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="AthleteReferrals.athlete_id",
    )
    tags: Mapped[list["AthleteTag"]] = relationship(
        "AthleteTag", back_populates="athlete", cascade="all, delete-orphan"
    )
    goals: Mapped[list["Goal"]] = relationship("Goal", back_populates="athlete", cascade="all, delete-orphan")
    tiers: Mapped[list["MembershipTier"]] = relationship("MembershipTier", back_populates="athlete", cascade="all, delete-orphan")
    products: Mapped[list["DigitalProduct"]] = relationship("DigitalProduct", back_populates="athlete", cascade="all, delete-orphan")
    booking_services: Mapped[list["BookingService"]] = relationship("BookingService", back_populates="athlete", cascade="all, delete-orphan")
    posts: Mapped[list["Post"]] = relationship("Post", back_populates="athlete", cascade="all, delete-orphan")
    withdrawal_requests: Mapped[list["WithdrawalRequest"]] = relationship(
        "WithdrawalRequest", back_populates="athlete", cascade="all, delete-orphan"
    )


class AthletePageSettings(Base):
    __tablename__ = "athlete_page_settings"

    athlete_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    page_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    page_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    agenda_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    agenda_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    agenda_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    thank_you_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_analytics_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="page_settings")


class AthleteSocialLink(Base):
    __tablename__ = "athlete_social_links"
    __table_args__ = (UniqueConstraint("athlete_id", "platform", name="uq_athlete_platform"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(
        Enum("instagram", "tiktok", "facebook", "twitter", name="social_platform_enum"), nullable=False
    )
    url: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="social_links")


class AthleteMonetization(Base):
    __tablename__ = "athlete_monetization"

    athlete_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    shake_price: Mapped[Decimal] = mapped_column(Numeric(8, 2), default=Decimal("3.00"))
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="monetization_currency_enum"), default="USD")
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="monetization")


class AthletePayouts(Base):
    __tablename__ = "athlete_payouts"

    athlete_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    country_code: Mapped[str] = mapped_column(String(2), default="MX")  # 'MX' o 'US'
    stripe_connect_account_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    stripe_details_submitted: Mapped[bool] = mapped_column(Boolean, default=False)
    payouts_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="payouts")


class AthleteReferrals(Base):
    __tablename__ = "athlete_referrals"

    athlete_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), primary_key=True
    )
    referral_code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    referred_by_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("athlete_profiles.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    athlete: Mapped[AthleteProfile] = relationship(
        "AthleteProfile", back_populates="referrals", foreign_keys=[athlete_id]
    )


class AthleteTag(Base):
    __tablename__ = "athlete_tags"
    __table_args__ = (UniqueConstraint("athlete_id", "sport_item_id", name="uq_athlete_sport"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    sport_item_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("lookup_items.id", ondelete="CASCADE"), nullable=False)

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="tags")
    sport_item: Mapped[LookupItem] = relationship("LookupItem")


# ==============================================================================
# MÓDULO 2: METAS, MEMBRESÍAS & SUSCRIPCIONES
# ==============================================================================

class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
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
# MÓDULO 3: TIENDA DIGITAL & ASESORÍAS 1-A-1
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
    availabilities: Mapped[list["BookingAvailability"]] = relationship(
        "BookingAvailability", back_populates="booking_service", cascade="all, delete-orphan"
    )


class BookingAvailability(Base):
    __tablename__ = "booking_availabilities"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    booking_service_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("booking_services.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
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
    status_code: Mapped[int] = mapped_column(Integer, default=501)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ==============================================================================
# MÓDULO 4: TRANSACCIONES (STRIPE) + SHAKE DETAILS
# ==============================================================================

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    transaction_uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    supporter_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    supporter_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    supporter_email: Mapped[str | None] = mapped_column(String(191), nullable=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="RESTRICT"), nullable=False)
    product_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("digital_products.id", ondelete="SET NULL"), nullable=True)
    subscription_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    booking_appointment_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("booking_appointments.id", ondelete="SET NULL", use_alter=True, name="transactions_booking_appt_fk"),
        nullable=True,
    )
    transaction_type_code: Mapped[int] = mapped_column(Integer, default=201, index=True)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(Enum("USD", "MXN", name="trans_currency_enum"), default="USD")
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    stripe_fee: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    net_athlete_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True)
    stripe_transfer_id: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True)
    status_code: Mapped[int] = mapped_column(Integer, default=301, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    supporter: Mapped["User | None"] = relationship("User")
    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile")
    shake_details: Mapped["ShakeDetails | None"] = relationship(
        "ShakeDetails", back_populates="transaction", uselist=False, cascade="all, delete-orphan"
    )


class ShakeDetails(Base):
    __tablename__ = "shake_details"

    transaction_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True
    )
    shakes_count: Mapped[int] = mapped_column(Integer, default=1)
    supporter_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    creator_reply: Mapped[str | None] = mapped_column(String(500), nullable=True)
    creator_reply_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_liked_by_creator: Mapped[bool] = mapped_column(Boolean, default=False)
    goal_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("goals.id", ondelete="SET NULL"), nullable=True)

    transaction: Mapped[Transaction] = relationship("Transaction", back_populates="shake_details")
    goal: Mapped["Goal | None"] = relationship("Goal")


# ==============================================================================
# MÓDULO 5: PUBLICACIONES, COMENTARIOS & NOTIFICACIONES
# ==============================================================================

class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("athlete_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content_html: Mapped[str] = mapped_column(LONGTEXT, nullable=False)
    access_type: Mapped[str] = mapped_column(
        Enum("public", "followers_only", "members_only", name="post_access_enum"), default="public"
    )
    minimum_tier_id: Mapped[int | None] = mapped_column(BigInteger, ForeignKey("membership_tiers.id", ondelete="SET NULL"), nullable=True)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    published_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="posts")
    comments: Mapped[list["PostComment"]] = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")
    likes: Mapped[list["PostLike"]] = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_user_post_like"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    post: Mapped[Post] = relationship("Post", back_populates="likes")
    user: Mapped[User] = relationship("User")


class PostComment(Base):
    __tablename__ = "post_comments"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    post: Mapped[Post] = relationship("Post", back_populates="comments")
    user: Mapped[User] = relationship("User")
    likes: Mapped[list["CommentLike"]] = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")


class CommentLike(Base):
    __tablename__ = "comment_likes"
    __table_args__ = (UniqueConstraint("user_id", "comment_id", name="uq_user_comment_like"),)

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comment_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), ForeignKey("post_comments.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    comment: Mapped[PostComment] = relationship("PostComment", back_populates="likes")
    user: Mapped[User] = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BIGINT(unsigned=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(String(255), nullable=False)
    type_code: Mapped[int] = mapped_column(Integer, default=401)
    action_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ==============================================================================
# MÓDULO 6: SEGUIDORES & VERIFICACIÓN OTP
# ==============================================================================

class AthleteFollow(Base):
    __tablename__ = "athlete_follows"
    __table_args__ = (UniqueConstraint("supporter_id", "athlete_id", name="uq_supporter_athlete"),)

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


# ==============================================================================
# MÓDULO 7: RETIROS DE ATLETAS (BDER ARCHITECTURE STYLE)
# ==============================================================================

class WithdrawalRequest(Base):
    __tablename__ = "withdrawal_requests"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    athlete_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("athlete_profiles.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    amount_usd: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    destination_country: Mapped[str] = mapped_column(String(2), default="MX")  # 'MX' o 'US'
    status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "completed", "failed", name="withdrawal_status_enum"),
        default="pending",
        nullable=False,
        index=True,
    )
    stripe_transfer_id: Mapped[str | None] = mapped_column(String(150), unique=True, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    processed_by_admin_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    athlete: Mapped[AthleteProfile] = relationship("AthleteProfile", back_populates="withdrawal_requests")
    processed_by: Mapped["User | None"] = relationship("User", foreign_keys=[processed_by_admin_id])

