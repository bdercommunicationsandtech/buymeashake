"""Helpers to load/flatten normalized athlete child tables for flat API DTOs."""
from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import (
    AthleteMonetization,
    AthletePageSettings,
    AthletePayouts,
    AthleteDiscipline,
    AthleteProfile,
    AthleteReferrals,
    AthleteSocialLink,
    City,
    Discipline,
)

SOCIAL_PLATFORMS = ("instagram", "tiktok", "facebook", "twitter")


def athlete_load_options():
    return (
        selectinload(AthleteProfile.user),
        selectinload(AthleteProfile.disciplines_association).selectinload(AthleteDiscipline.discipline),
        selectinload(AthleteProfile.page_settings),
        selectinload(AthleteProfile.social_links),
        selectinload(AthleteProfile.monetization),
        selectinload(AthleteProfile.payouts),
        selectinload(AthleteProfile.referrals),
        selectinload(AthleteProfile.goals),
        selectinload(AthleteProfile.booking_services),
        selectinload(AthleteProfile.tiers),
        selectinload(AthleteProfile.products),
        selectinload(AthleteProfile.city_ref).selectinload(City.state),
        selectinload(AthleteProfile.city_ref).selectinload(City.country),
    )


def social_url_map(profile: AthleteProfile) -> dict[str, str | None]:
    urls = {p: None for p in SOCIAL_PLATFORMS}
    for link in profile.social_links or []:
        urls[link.platform] = link.url
    return urls


def page_settings_or_empty(profile: AthleteProfile) -> AthletePageSettings | None:
    return profile.page_settings


def flatten_social(profile: AthleteProfile) -> dict[str, str | None]:
    urls = social_url_map(profile)
    return {
        "instagram_url": urls.get("instagram"),
        "tiktok_url": urls.get("tiktok"),
        "facebook_url": urls.get("facebook"),
        "twitter_url": urls.get("twitter"),
    }


def get_shake_price(profile: AthleteProfile) -> Decimal:
    if profile.monetization and profile.monetization.shake_price is not None:
        return profile.monetization.shake_price
    return Decimal("3.00")


def get_currency(profile: AthleteProfile) -> str:
    if profile.monetization and profile.monetization.currency:
        return profile.monetization.currency
    return "USD"


def get_referral_code(profile: AthleteProfile) -> str | None:
    if profile.referrals:
        return profile.referrals.referral_code
    return None


def get_thank_you(profile: AthleteProfile) -> str | None:
    if profile.page_settings:
        return profile.page_settings.thank_you_message
    return None


def get_cover_url(profile: AthleteProfile) -> str | None:
    if profile.page_settings:
        return profile.page_settings.cover_image_url
    return None


def get_page_field(profile: AthleteProfile, field: str) -> str | None:
    ps = profile.page_settings
    if not ps:
        return None
    return getattr(ps, field, None)


def format_city_label(city: City | None) -> str | None:
    if not city:
        return None
    parts = [city.name]
    if city.state and city.state.name:
        parts.append(city.state.name)
    if city.country_code:
        parts.append(city.country_code)
    return ", ".join(parts)


def resolve_city_display(profile: AthleteProfile) -> str | None:
    if profile.city_ref:
        return format_city_label(profile.city_ref) or profile.city
    return profile.city


def discipline_ids(profile: AthleteProfile) -> list[int]:
    if not profile.disciplines_association:
        return []
    return [assoc.discipline.id for assoc in profile.disciplines_association if assoc.discipline]


def discipline_labels(profile: AthleteProfile) -> list[str]:
    if not profile.disciplines_association:
        return []
    return [assoc.discipline.name for assoc in profile.disciplines_association if assoc.discipline]


async def resolve_discipline_ids(session: AsyncSession, ids: list[int] | None) -> list[int]:
    if not ids:
        return []
    query = select(Discipline.id).where(Discipline.id.in_(ids), Discipline.is_active.is_(True))
    result = await session.execute(query)
    return list(result.scalars().all())


async def ensure_child_rows(
    session: AsyncSession,
    athlete: AthleteProfile,
    *,
    referral_code: str,
    referred_by_id: int | None = None,
) -> None:
    """Create default child rows for a new athlete profile.

    Uses session.get (not relationship attribute access) so AsyncSession never
    triggers a sync lazy-load after schema normalization.
    """
    await ensure_page_settings(session, athlete)
    await ensure_monetization(session, athlete, shake_price=Decimal("3.00"), currency="USD")
    await ensure_payouts(session, athlete)
    existing_ref = await session.get(AthleteReferrals, athlete.id)
    if existing_ref is None:
        referrals = AthleteReferrals(
            athlete_id=athlete.id,
            referral_code=referral_code,
            referred_by_id=referred_by_id,
        )
        session.add(referrals)
        athlete.referrals = referrals
    else:
        athlete.referrals = existing_ref
    await session.flush()


async def upsert_social_links(
    session: AsyncSession,
    athlete: AthleteProfile,
    urls: dict[str, str | None],
) -> None:
    existing = {link.platform: link for link in (athlete.social_links or [])}
    for platform in SOCIAL_PLATFORMS:
        if platform not in urls:
            continue
        url = urls[platform]
        if url is None:
            continue
        url = url.strip()
        if not url:
            if platform in existing:
                await session.delete(existing[platform])
            continue
        if platform in existing:
            existing[platform].url = url
        else:
            session.add(AthleteSocialLink(athlete_id=athlete.id, platform=platform, url=url))
    await session.flush()


async def ensure_page_settings(session: AsyncSession, athlete: AthleteProfile) -> AthletePageSettings:
    existing = await session.get(AthletePageSettings, athlete.id)
    if existing:
        athlete.page_settings = existing
        return existing
    ps = AthletePageSettings(athlete_id=athlete.id)
    session.add(ps)
    athlete.page_settings = ps
    return ps


async def ensure_monetization(
    session: AsyncSession,
    athlete: AthleteProfile,
    *,
    shake_price: Decimal | None = None,
    currency: str | None = None,
) -> AthleteMonetization:
    existing = await session.get(AthleteMonetization, athlete.id)
    if existing:
        athlete.monetization = existing
        return existing
    m = AthleteMonetization(
        athlete_id=athlete.id,
        shake_price=shake_price if shake_price is not None else Decimal("3.00"),
        currency=currency or "USD",
    )
    session.add(m)
    athlete.monetization = m
    return m


async def ensure_payouts(session: AsyncSession, athlete: AthleteProfile) -> AthletePayouts:
    existing = await session.get(AthletePayouts, athlete.id)
    if existing:
        athlete.payouts = existing
        return existing
    p = AthletePayouts(athlete_id=athlete.id, payouts_enabled=False)
    session.add(p)
    athlete.payouts = p
    return p
