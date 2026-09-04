import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from contextlib import asynccontextmanager

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.core.exceptions import register_exception_handlers
import app.models  # noqa: F401 — registra modelos en Base.metadata para create_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-crear nuevas tablas añadidas (athlete_follows, email_verifications, etc.)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as exc:
        import logging
        logging.getLogger("uvicorn.error").warning(f"[DB LIFESPAN WARNING] No se pudo ejecutar create_all al inicio: {exc}")
    yield


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    register_exception_handlers(app)

    static_root = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
    os.makedirs(os.path.join(static_root, "uploads", "images"), exist_ok=True)
    os.makedirs(os.path.join(static_root, "uploads", "products"), exist_ok=True)
    app.mount("/static", StaticFiles(directory=static_root), name="static")

    app.include_router(api_router, prefix=settings.API_V1_STR)

    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok", "service": settings.PROJECT_NAME}

    @app.get("/", tags=["Root"])
    async def read_root() -> dict[str, str]:
        return {
            "status": "online",
            "service": settings.PROJECT_NAME,
            "documentation": f"{settings.API_V1_STR}/docs",
        }

    return app


app = create_application()
