"""Cloudflare Turnstile verification (optional CAPTCHA for login)."""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import BusinessLogicError

logger = logging.getLogger(__name__)

TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def verify_turnstile_token(token: str | None) -> None:
    """
    Validate a Turnstile token when CLOUDFLARE_TURNSTILE_SECRET_KEY is set.
    If the secret is empty, verification is skipped (local/dev without CAPTCHA).
    On Cloudflare connectivity errors, fail-open (same as Bder admin).
    """
    secret = (settings.CLOUDFLARE_TURNSTILE_SECRET_KEY or "").strip()
    if not secret:
        return

    if not (token or "").strip():
        raise BusinessLogicError(
            "Se requiere el token de verificación de Cloudflare Turnstile.",
            details={"reason_code": "TURNSTILE_REQUIRED"},
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(
                TURNSTILE_SITEVERIFY_URL,
                data={"secret": secret, "response": token},
            )
            verification: dict[str, Any] = res.json()
    except httpx.HTTPError as exc:
        logger.warning(
            "Error de conectividad con Cloudflare Turnstile: %s. Se permite fail-open.",
            exc,
        )
        return

    if not verification.get("success"):
        raise BusinessLogicError(
            "Validación de CAPTCHA inválida o expirada.",
            details={
                "reason_code": "TURNSTILE_INVALID",
                "error_codes": verification.get("error-codes") or [],
            },
        )
