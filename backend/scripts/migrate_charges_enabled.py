"""Idempotent MySQL migration: add athlete_payouts.charges_enabled.

Loads credentials from backend/.env via app.core.config.Settings
(same as the API), so run from repo root or backend/:

  python backend/scripts/migrate_charges_enabled.py
  python scripts/migrate_charges_enabled.py
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

import aiomysql

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# Ensure pydantic-settings reads backend/.env even if cwd is the repo root.
os_environ_hint = BACKEND_ROOT / ".env"

try:
    from dotenv import load_dotenv

    load_dotenv(os_environ_hint)
    load_dotenv()  # also allow cwd .env overrides
except ImportError:
    pass

from app.core.config import settings  # noqa: E402


async def column_exists(cursor: aiomysql.Cursor, table: str, column: str) -> bool:
    await cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = %s
          AND COLUMN_NAME = %s
        """,
        (table, column),
    )
    row = await cursor.fetchone()
    return bool(row and row[0])


async def apply(cursor: aiomysql.Cursor) -> str:
    if await column_exists(cursor, "athlete_payouts", "charges_enabled"):
        return "charges_enabled already exists"
    await cursor.execute(
        """
        ALTER TABLE `athlete_payouts`
        ADD COLUMN `charges_enabled` BOOLEAN NOT NULL DEFAULT FALSE
        AFTER `payouts_enabled`
        """
    )
    return "added charges_enabled"


async def rollback(cursor: aiomysql.Cursor) -> str:
    if not await column_exists(cursor, "athlete_payouts", "charges_enabled"):
        return "charges_enabled already absent"
    await cursor.execute("ALTER TABLE `athlete_payouts` DROP COLUMN `charges_enabled`")
    return "dropped charges_enabled"


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rollback", action="store_true")
    args = parser.parse_args()

    print(
        f"Connecting to {settings.USER_DB}@{settings.HOST}:{settings.PORT_DB}/{settings.DATABASE} ..."
    )
    conn = await aiomysql.connect(
        host=settings.HOST,
        port=settings.PORT_DB,
        user=settings.USER_DB,
        password=settings.PASSWORD,
        db=settings.DATABASE,
        autocommit=True,
    )
    try:
        async with conn.cursor() as cursor:
            msg = await (rollback(cursor) if args.rollback else apply(cursor))
            print(msg)
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
