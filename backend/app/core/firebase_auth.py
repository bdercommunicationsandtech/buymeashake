"""Firebase Admin helpers for verifying Google/Apple ID tokens."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials

from app.core.config import settings
from app.core.exceptions import UnauthorizedError


@lru_cache(maxsize=1)
def _ensure_firebase_app() -> firebase_admin.App:
    if firebase_admin._apps:
        return firebase_admin.get_app()

    raw = (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
    if not raw:
        raise UnauthorizedError(
            "Firebase no está configurado en el servidor (FIREBASE_CREDENTIALS_JSON)."
        )

    try:
        if raw.startswith("{"):
            cred_info = json.loads(raw)
            cred = credentials.Certificate(cred_info)
        else:
            path = Path(raw)
            if not path.is_file():
                raise UnauthorizedError(
                    "No se encontró el archivo de credenciales de Firebase."
                )
            cred = credentials.Certificate(str(path))

        options: dict[str, Any] = {}
        if settings.FIREBASE_PROJECT_ID:
            options["projectId"] = settings.FIREBASE_PROJECT_ID

        return firebase_admin.initialize_app(cred, options or None)
    except UnauthorizedError:
        raise
    except Exception as exc:
        raise UnauthorizedError(
            f"No se pudo inicializar Firebase Admin: {exc}"
        ) from exc


def verify_firebase_id_token(id_token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return its claims."""
    if not id_token or not id_token.strip():
        raise UnauthorizedError("Token de Firebase inválido.")

    _ensure_firebase_app()
    try:
        return auth.verify_id_token(id_token.strip())
    except Exception as exc:
        raise UnauthorizedError(
            "Token de Firebase inválido o expirado."
        ) from exc
