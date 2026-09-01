from collections.abc import AsyncGenerator
from urllib.parse import quote_plus

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# URL construida igual que buyer1/services (quote_plus + variables separadas)
DATABASE_URL = (
    f"mysql+aiomysql://{quote_plus(settings.USER_DB)}:{quote_plus(settings.PASSWORD)}"
    f"@{settings.HOST}:{settings.PORT_DB}/{settings.DATABASE}"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=(settings.ENVIRONMENT == "development"),
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_timeout=30,
    connect_args={"connect_timeout": 10},
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection provider para sesiones asíncronas de base de datos."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# Alias compatible con buyer1 (get_db)
get_db = get_db_session
