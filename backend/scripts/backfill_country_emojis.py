"""
Backfill countries.emoji from ISO2 flag letters.

The source dump often stores emoji as '??' (UTF-8 loss). Flag emojis are
deterministic from iso2 via Unicode regional indicator symbols.

Uso:
  cd backend
  .venv\\Scripts\\python.exe scripts/backfill_country_emojis.py
  .venv\\Scripts\\python.exe scripts/backfill_country_emojis.py --dry-run
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import async_session_factory, engine  # noqa: E402
from app.models.entities import Country  # noqa: E402


def emoji_from_iso2(iso2: str | None) -> str | None:
    if not iso2 or len(iso2) != 2:
        return None
    a, b = iso2.upper()
    if not (a.isalpha() and b.isalpha()):
        return None
    return chr(0x1F1E6 + ord(a) - ord("A")) + chr(0x1F1E6 + ord(b) - ord("A"))


async def backfill(*, dry_run: bool) -> None:
    async with async_session_factory() as session:
        countries = list((await session.execute(select(Country))).scalars().all())
        updated = 0
        skipped = 0
        for country in countries:
            emoji = emoji_from_iso2(country.iso2)
            if not emoji:
                skipped += 1
                continue
            if country.emoji == emoji:
                continue
            safe = f"  {country.iso2} {country.name}: {country.emoji!r} -> {emoji!r}"
            print(safe.encode("ascii", "backslashreplace").decode("ascii"))
            if not dry_run:
                country.emoji = emoji
            updated += 1

        if dry_run:
            await session.rollback()
            print(f"Dry-run done. would_update={updated} skipped={skipped}")
        else:
            await session.commit()
            print(f"Backfill done. updated={updated} skipped={skipped}")

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill countries.emoji from iso2")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
