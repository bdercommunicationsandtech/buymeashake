"""
Inserta 10 atletas demo con disciplinas del catálogo lookup_items (códigos 101-109).

Uso:
    cd backend
    .venv\\Scripts\\python.exe scripts/seed_demo_athletes.py
"""
from __future__ import annotations

import asyncio
from decimal import Decimal

from sqlalchemy import delete, select

from app.core.database import async_session_factory
from app.core.security import get_password_hash
from app.models.entities import AthleteProfile, Goal, User
from app.services.profile_helpers import ensure_child_rows, ensure_monetization, resolve_sport_item_id

DEMO_PASSWORD = "DemoShake2026!"
DEMO_EMAIL_DOMAIN = "demo.buymeashake.fit"

ATHLETES: list[dict] = [
    {
        "full_name": "Diego Herrera",
        "handle": "diego_power",
        "email": f"diego.power@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 101,
        "discipline": "Fuerza & Levantamiento",
        "city": "Ciudad de México",
        "bio": "Powerlifter y coach de fuerza. Programas de sentadilla, press y deadlift para todos los niveles.",
        "shake_price": Decimal("4.00"),
        "goal_title": "Competir en nationals de powerlifting",
        "goal_target": Decimal("2500.00"),
    },
    {
        "full_name": "Camila Rivas",
        "handle": "camila_cross",
        "email": f"camila.cross@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 102,
        "discipline": "CrossFit & Funcional",
        "city": "Guadalajara",
        "bio": "Atleta CrossFit y entrenadora funcional. WODs diarios y preparación para competencias.",
        "shake_price": Decimal("3.50"),
        "goal_title": "Viaje al CrossFit Games regionales",
        "goal_target": Decimal("1800.00"),
    },
    {
        "full_name": "Andrés Molina",
        "handle": "andres_run",
        "email": f"andres.run@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 103,
        "discipline": "Running & Atletismo",
        "city": "Monterrey",
        "bio": "Corredor de media y larga distancia. Planes de maratón y trail running.",
        "shake_price": Decimal("3.00"),
        "goal_title": "Maratón de Nueva York 2027",
        "goal_target": Decimal("3200.00"),
    },
    {
        "full_name": "Laura Peña",
        "handle": "laura_cycling",
        "email": f"laura.cycling@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 104,
        "discipline": "Ciclismo & Ruta",
        "city": "Puebla",
        "bio": "Ciclista de ruta y gravel. Rutas, técnica de pedaleo y preparación para cicloturismo.",
        "shake_price": Decimal("4.50"),
        "goal_title": "Nueva bici de competencia",
        "goal_target": Decimal("4500.00"),
    },
    {
        "full_name": "Javier Ortiz",
        "handle": "javier_combat",
        "email": f"javier.combat@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 105,
        "discipline": "Artes Marciales & Boxeo",
        "city": "Tijuana",
        "bio": "Boxeador amateur y coach de striking. Técnica, sparring y acondicionamiento.",
        "shake_price": Decimal("3.75"),
        "goal_title": "Camp de entrenamiento internacional",
        "goal_target": Decimal("2000.00"),
    },
    {
        "full_name": "Valentina Soto",
        "handle": "valentina_swim",
        "email": f"valentina.swim@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 106,
        "discipline": "Deportes Acuáticos & Natación",
        "city": "Veracruz",
        "bio": "Nadadora y coach de aguas abiertas. Técnica de crawl y preparación para triatlón.",
        "shake_price": Decimal("3.25"),
        "goal_title": "Equipo de natación en aguas abiertas",
        "goal_target": Decimal("1500.00"),
    },
    {
        "full_name": "Mateo García",
        "handle": "mateo_futbol",
        "email": f"mateo.futbol@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 107,
        "discipline": "Fútbol & Colectivos",
        "city": "Querétaro",
        "bio": "Ex jugador semi-pro y preparador físico. Fútbol, coordinación y trabajo en equipo.",
        "shake_price": Decimal("3.00"),
        "goal_title": "Clínica de fútbol para jóvenes",
        "goal_target": Decimal("1200.00"),
    },
    {
        "full_name": "Sofía Martínez",
        "handle": "sofia_yoga",
        "email": f"sofia.yoga@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 108,
        "discipline": "Movilidad & Yoga",
        "city": "Oaxaca",
        "bio": "Instructora de yoga y movilidad. Clases de Vinyasa, stretching y recuperación activa.",
        "shake_price": Decimal("2.50"),
        "goal_title": "Retiro de yoga en la sierra",
        "goal_target": Decimal("900.00"),
    },
    {
        "full_name": "Bruno Costa",
        "handle": "bruno_calistenia",
        "email": f"bruno.calistenia@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 109,
        "discipline": "Calistenia & Freestyle",
        "city": "León",
        "bio": "Atleta de calistenia y street workout. Muscle-ups, handstands y progresiones.",
        "shake_price": Decimal("3.50"),
        "goal_title": "Parque de calistenia comunitario",
        "goal_target": Decimal("2800.00"),
    },
    {
        "full_name": "Isabella Nunez",
        "handle": "isabella_hybrid",
        "email": f"isabella.hybrid@{DEMO_EMAIL_DOMAIN}",
        "primary_sport_code": 103,
        "discipline": "Running & Atletismo (híbrido trail + ciclismo)",
        "city": "Merida",
        "bio": "Triatleta y coach híbrida. Combina running, ciclismo y natación para atletas de endurance.",
        "shake_price": Decimal("4.00"),
        "goal_title": "Ironman 70.3 — inscripción y viaje",
        "goal_target": Decimal("3500.00"),
    },
]


async def remove_existing_demo_users(session) -> int:
    demo_users = (
        await session.execute(
            select(User).where(User.email.like(f"%@{DEMO_EMAIL_DOMAIN}"))
        )
    ).scalars().all()
    if not demo_users:
        return 0

    user_ids = [u.id for u in demo_users]
    athlete_ids = (
        await session.execute(
            select(AthleteProfile.id).where(AthleteProfile.user_id.in_(user_ids))
        )
    ).scalars().all()

    if athlete_ids:
        await session.execute(delete(Goal).where(Goal.athlete_id.in_(athlete_ids)))
        await session.execute(delete(AthleteProfile).where(AthleteProfile.id.in_(athlete_ids)))

    await session.execute(delete(User).where(User.id.in_(user_ids)))
    await session.flush()
    return len(demo_users)


async def seed_athletes() -> None:
    password_hash = get_password_hash(DEMO_PASSWORD)

    async with async_session_factory() as session:
        removed = await remove_existing_demo_users(session)
        if removed:
            print(f"Eliminados {removed} usuarios demo anteriores.")

        created = 0
        for athlete_data in ATHLETES:
            user = User(
                email=athlete_data["email"],
                password_hash=password_hash,
                full_name=athlete_data["full_name"],
                role="athlete",
                is_email_verified=True,
            )
            session.add(user)
            await session.flush()

            sport_item_id = await resolve_sport_item_id(session, athlete_data["primary_sport_code"])
            profile = AthleteProfile(
                user_id=user.id,
                handle=athlete_data["handle"],
                bio=athlete_data["bio"],
                primary_sport_item_id=sport_item_id,
                city=athlete_data["city"],
                is_verified=True,
            )
            session.add(profile)
            await session.flush()

            await ensure_child_rows(
                session,
                profile,
                referral_code=f"{athlete_data['handle']}_demo",
            )
            mon = ensure_monetization(session, profile)
            mon.shake_price = athlete_data["shake_price"]
            mon.currency = "USD"

            goal = Goal(
                athlete_id=profile.id,
                title=athlete_data["goal_title"],
                target_amount=athlete_data["goal_target"],
                currency="USD",
                is_active=True,
            )
            session.add(goal)
            created += 1
            print(
                f"  + {athlete_data['full_name']} (@{athlete_data['handle']}) "
                f"[{athlete_data['discipline']} · código {athlete_data['primary_sport_code']}]"
            )

        await session.commit()
        print(f"\nListo: {created} atletas creados.")
        print(f"Contraseña para todos: {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(seed_athletes())
