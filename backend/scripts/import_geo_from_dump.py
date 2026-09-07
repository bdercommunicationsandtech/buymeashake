"""
Importa countries / states / cities desde Dump20260907.sql (estilo dr5hn).

- countries + states: catálogo completo
- cities: solo country_code IN ('MX', 'US')
- Omite currency*, regions/subregions, timezones, translations

Uso:
  cd backend
  .venv\\Scripts\\python.exe scripts/import_geo_from_dump.py
  .venv\\Scripts\\python.exe scripts/import_geo_from_dump.py --dump "C:/Users/.../Dump20260907.sql"
  .venv\\Scripts\\python.exe scripts/import_geo_from_dump.py --skip-ddl
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from pathlib import Path

from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.database import async_session_factory, engine  # noqa: E402

DEFAULT_DUMP = Path(r"C:\Users\BDER COMMUNICATIONS\Documents\dumps\Dump20260907.sql")
DDL_PATH = Path(__file__).resolve().parent / "add_geo_catalog.sql"
CITY_COUNTRY_CODES = {"MX", "US"}
BATCH = 400

INSERT_RE = re.compile(
    r"INSERT INTO `(?P<table>countries|states|cities)` VALUES\s*(?P<body>.+?)(?=;\s*(?:/\*!|$|UNLOCK|INSERT|CREATE|--))",
    re.IGNORECASE | re.DOTALL,
)

COUNTRY_SQL = """
INSERT INTO countries
  (id, name, iso3, numeric_code, iso2, phonecode, capital, tld, native, nationality,
   latitude, longitude, emoji, flag, wikiDataId, created_at, updated_at)
VALUES
  (:id, :name, :iso3, :numeric_code, :iso2, :phonecode, :capital, :tld, :native, :nationality,
   :latitude, :longitude, :emoji, :flag, :wikiDataId, :created_at, :updated_at)
"""

STATE_SQL = """
INSERT INTO states
  (id, name, country_id, country_code, iso2, type, latitude, longitude, flag, wikiDataId, created_at, updated_at)
VALUES
  (:id, :name, :country_id, :country_code, :iso2, :type, :latitude, :longitude, :flag, :wikiDataId, :created_at, :updated_at)
"""

CITY_SQL = """
INSERT INTO cities
  (id, name, state_id, state_code, country_id, country_code, latitude, longitude, flag, wikiDataId, created_at, updated_at)
VALUES
  (:id, :name, :state_id, :state_code, :country_id, :country_code, :latitude, :longitude, :flag, :wikiDataId, :created_at, :updated_at)
"""


def parse_sql_tuples(values_blob: str) -> list[tuple]:
    rows: list[tuple] = []
    i = 0
    n = len(values_blob)

    def skip_ws() -> None:
        nonlocal i
        while i < n and values_blob[i] in " \t\r\n":
            i += 1

    while i < n:
        skip_ws()
        if i >= n or values_blob[i] == ";":
            break
        if values_blob[i] == ",":
            i += 1
            continue
        if values_blob[i] != "(":
            i += 1
            continue
        i += 1
        fields: list = []
        while i < n:
            skip_ws()
            if i >= n:
                break
            if values_blob[i] == ")":
                i += 1
                rows.append(tuple(fields))
                break
            if values_blob[i] == ",":
                i += 1
                continue
            if values_blob.startswith("NULL", i) and (i + 4 >= n or values_blob[i + 4] in ",)"):
                fields.append(None)
                i += 4
                continue
            if values_blob[i] in ("'", '"'):
                quote = values_blob[i]
                i += 1
                buf: list[str] = []
                while i < n:
                    ch = values_blob[i]
                    if ch == "\\" and i + 1 < n:
                        buf.append(values_blob[i + 1])
                        i += 2
                        continue
                    if ch == quote:
                        if i + 1 < n and values_blob[i + 1] == quote:
                            buf.append(quote)
                            i += 2
                            continue
                        i += 1
                        break
                    buf.append(ch)
                    i += 1
                fields.append("".join(buf))
                continue
            start = i
            while i < n and values_blob[i] not in ",)":
                i += 1
            raw = values_blob[start:i].strip()
            if raw.isdigit() or (raw.startswith("-") and raw[1:].isdigit()):
                fields.append(int(raw))
            else:
                try:
                    fields.append(float(raw))
                except ValueError:
                    fields.append(raw)
    return rows


def extract_inserts(dump_text: str) -> dict[str, list[tuple]]:
    out: dict[str, list[tuple]] = {"countries": [], "states": [], "cities": []}
    for m in INSERT_RE.finditer(dump_text):
        table = m.group("table").lower()
        body = m.group("body").rstrip().rstrip(";")
        rows = parse_sql_tuples(body)
        out[table].extend(rows)
        print(f"  Parsed {len(rows)} rows from INSERT `{table}`")
    return out


def emoji_from_iso2(iso2: str | None) -> str | None:
    """Build flag emoji from ISO2 (regional indicator symbols)."""
    if not iso2 or len(iso2) != 2:
        return None
    a, b = iso2.upper()
    if not (a.isalpha() and b.isalpha()):
        return None
    return chr(0x1F1E6 + ord(a) - ord("A")) + chr(0x1F1E6 + ord(b) - ord("A"))


def emoji_from_codepoints(raw: str | None) -> str | None:
    """Parse dump emojiU values like 'U+1F1E6 U+1F1EB'."""
    if not raw or not isinstance(raw, str):
        return None
    parts = re.findall(r"U\+([0-9A-Fa-f]+)", raw)
    if not parts:
        return None
    try:
        return "".join(chr(int(p, 16)) for p in parts)
    except ValueError:
        return None


def map_country(row: tuple) -> dict | None:
    if len(row) < 27:
        return None
    iso2 = row[4]
    # Dump often stores emoji as '??' (encoding loss); prefer ISO2 / emojiU.
    raw_emoji = row[21] if isinstance(row[21], str) else None
    emoji = None
    if raw_emoji and raw_emoji not in ("??", "?", ""):
        emoji = raw_emoji
    if not emoji and len(row) > 22:
        emoji = emoji_from_codepoints(row[22] if isinstance(row[22], str) else None)
    if not emoji:
        emoji = emoji_from_iso2(str(iso2) if iso2 else None)
    return {
        "id": row[0],
        "name": row[1],
        "iso3": row[2],
        "numeric_code": row[3],
        "iso2": iso2,
        "phonecode": row[5],
        "capital": row[6],
        "tld": row[10],
        "native": row[11],
        "nationality": row[16],
        "latitude": row[19],
        "longitude": row[20],
        "emoji": emoji,
        "flag": 1 if row[25] in (1, True, "1") else 0,
        "wikiDataId": row[26],
        "created_at": row[23],
        "updated_at": row[24],
    }


def map_state(row: tuple) -> dict | None:
    if len(row) < 13:
        return None
    return {
        "id": row[0],
        "name": row[1],
        "country_id": row[2],
        "country_code": row[3],
        "iso2": row[5],
        "type": row[6],
        "latitude": row[7],
        "longitude": row[8],
        "flag": 1 if row[11] in (1, True, "1") else 0,
        "wikiDataId": row[12],
        "created_at": row[9],
        "updated_at": row[10],
    }


def map_city(row: tuple) -> dict | None:
    if len(row) < 12:
        return None
    cc = str(row[5] or "").upper()
    if cc not in CITY_COUNTRY_CODES:
        return None
    return {
        "id": row[0],
        "name": row[1],
        "state_id": row[2],
        "state_code": row[3],
        "country_id": row[4],
        "country_code": cc,
        "latitude": row[6],
        "longitude": row[7],
        "flag": 1 if row[10] in (1, True, "1") else 0,
        "wikiDataId": row[11],
        "created_at": row[8],
        "updated_at": row[9],
    }


async def run_ddl(session) -> None:
    sql = DDL_PATH.read_text(encoding="utf-8")
    for stmt in sql.split(";"):
        lines = [ln for ln in stmt.splitlines() if not ln.strip().startswith("--")]
        chunk = "\n".join(lines).strip()
        if not chunk:
            continue
        await session.execute(text(chunk))
    await session.commit()
    print("DDL applied:", DDL_PATH.name)


async def truncate_geo(session) -> None:
    await session.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
    await session.execute(text("TRUNCATE TABLE cities"))
    await session.execute(text("TRUNCATE TABLE states"))
    await session.execute(text("TRUNCATE TABLE countries"))
    await session.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    await session.commit()
    print("Truncated geo tables")


async def insert_dicts(session, sql: str, rows: list[dict], label: str) -> None:
    if not rows:
        print(f"  {label}: 0 rows")
        return
    total = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        await session.execute(text(sql), batch)
        total += len(batch)
        if total % 2000 == 0 or total == len(rows):
            print(f"  {label}: {total}/{len(rows)}")
            await session.commit()
    await session.commit()


async def main_async(dump_path: Path, skip_ddl: bool, truncate: bool) -> None:
    if not dump_path.exists():
        raise SystemExit(f"Dump no encontrado: {dump_path}")

    print(f"Reading dump ({dump_path.stat().st_size / 1e6:.1f} MB)...")
    dump_text = dump_path.read_text(encoding="utf-8", errors="replace")
    print("Parsing INSERTs...")
    parsed = extract_inserts(dump_text)

    countries = [d for r in parsed["countries"] if (d := map_country(r))]
    states = [d for r in parsed["states"] if (d := map_state(r))]
    cities = [d for r in parsed["cities"] if (d := map_city(r))]
    print(f"Mapped countries={len(countries)} states={len(states)} cities(MX+US)={len(cities)}")

    async with async_session_factory() as session:
        if not skip_ddl:
            await run_ddl(session)
        if truncate:
            await truncate_geo(session)

        print("Inserting countries...")
        await insert_dicts(session, COUNTRY_SQL, countries, "countries")
        print("Inserting states...")
        await insert_dicts(session, STATE_SQL, states, "states")
        print("Inserting cities (MX+US)...")
        await insert_dicts(session, CITY_SQL, cities, "cities")

    await engine.dispose()
    print("Done.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Import geo catalog into buymeashake")
    parser.add_argument("--dump", type=Path, default=DEFAULT_DUMP)
    parser.add_argument("--skip-ddl", action="store_true")
    parser.add_argument("--no-truncate", action="store_true")
    args = parser.parse_args()
    asyncio.run(main_async(args.dump, args.skip_ddl, not args.no_truncate))


if __name__ == "__main__":
    main()
