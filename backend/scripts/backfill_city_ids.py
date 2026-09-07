"""
Backfill athlete_profiles.city_id from free-text city labels.

Matching rules (conservative):
1. Prefer unique match on cities.name within MX+US (seeded countries).
2. If label looks like "City, State, CC", try exact city name + country_code.
3. Only update when there is exactly one candidate; skip ambiguous names.
4. Refresh city label cache to "City, State, CC".

Uso:
  cd backend
  .venv\\Scripts\\python.exe scripts/backfill_city_ids.py
  .venv\\Scripts\\python.exe scripts/backfill_city_ids.py --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import async_session_factory, engine  # noqa: E402
from app.models.entities import AthleteProfile, City, State  # noqa: E402
from app.services.profile_helpers import format_city_label  # noqa: E402

SEEDED_COUNTRY_CODES = ("MX", "US")


def parse_label(raw: str) -> tuple[str, str | None, str | None]:
    """Return (city_name, state_hint, country_code_hint)."""
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if not parts:
        return raw.strip(), None, None
    city_name = parts[0]
    state_hint = parts[1] if len(parts) >= 2 else None
    cc = None
    if len(parts) >= 3 and len(parts[-1]) == 2:
        cc = parts[-1].upper()
    elif len(parts) == 2 and len(parts[1]) == 2:
        cc = parts[1].upper()
        state_hint = None
    return city_name, state_hint, cc


async def find_unique_city(
    session,
    city_name: str,
    state_hint: str | None,
    country_code: str | None,
) -> City | None:
    stmt = (
        select(City)
        .options(selectinload(City.state), selectinload(City.country))
        .where(
            func.lower(City.name) == city_name.lower(),
            City.country_code.in_(SEEDED_COUNTRY_CODES),
            City.flag.is_(True),
        )
    )
    # Prefer MX when the free-text label has no country hint (BMS default).
    effective_cc = country_code if country_code in SEEDED_COUNTRY_CODES else "MX"
    stmt = stmt.where(City.country_code == effective_cc)
    if state_hint:
        stmt = stmt.join(State, City.state_id == State.id).where(
            func.lower(State.name) == state_hint.lower()
        )

    rows = list((await session.execute(stmt)).scalars().all())
    if len(rows) == 1:
        return rows[0]

    # If default MX failed and label had no CC, try US once.
    if country_code is None and effective_cc == "MX" and not state_hint:
        us_stmt = (
            select(City)
            .options(selectinload(City.state), selectinload(City.country))
            .where(
                func.lower(City.name) == city_name.lower(),
                City.country_code == "US",
                City.flag.is_(True),
            )
        )
        us_rows = list((await session.execute(us_stmt)).scalars().all())
        if len(us_rows) == 1:
            return us_rows[0]
    return None


async def backfill(*, dry_run: bool) -> None:
    async with async_session_factory() as session:
        result = await session.execute(
            select(AthleteProfile).where(
                AthleteProfile.city_id.is_(None),
                AthleteProfile.city.is_not(None),
                AthleteProfile.city != "",
            )
        )
        profiles = list(result.scalars().all())
        print(f"Profiles with free-text city and no city_id: {len(profiles)}")

        matched = 0
        skipped = 0
        for profile in profiles:
            city_name, state_hint, cc = parse_label(profile.city or "")
            if not city_name:
                skipped += 1
                continue
            city = await find_unique_city(session, city_name, state_hint, cc)
            if not city:
                print(f"  skip id={profile.id} city={profile.city!r}")
                skipped += 1
                continue
            label = format_city_label(city)
            print(f"  match id={profile.id} {profile.city!r} -> city_id={city.id} ({label})")
            if not dry_run:
                profile.city_id = city.id
                if label:
                    profile.city = label
            matched += 1

        if dry_run:
            await session.rollback()
            print(f"Dry-run done. would_match={matched} skipped={skipped}")
        else:
            await session.commit()
            print(f"Backfill done. matched={matched} skipped={skipped}")

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill athlete_profiles.city_id")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
