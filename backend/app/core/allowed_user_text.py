"""Allowlist for free-form user text (profiles, messages, titles).

Aligned with frontend `allowed-user-text.util.ts` and Buyer1.
Allowed: letters (incl. ES accents + ü), digits, spaces, . , ? ¿ ¡ ! @ : / - _
Excluded (injection-prone): ' & ( )

Do NOT apply to: passwords, emails, URLs, OTP, HTML/rich-text content.
"""

from __future__ import annotations

import re
from typing import Any

USER_TEXT_PATTERN = re.compile(r"^[a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9\s.,?¿¡!@:/\-_]+$")
USER_TEXT_STRIP = re.compile(r"[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ0-9\s.,?¿¡!@:/\-_]+")

INVALID_CHARS_MESSAGE = (
    "Solo se permiten letras, números, espacios y estos símbolos: . , ? ¿ ¡ ! @ : / - _"
)


def has_only_allowed_user_text_chars(value: str | None) -> bool:
    """Empty/None OK; non-empty must match allowlist after trim."""
    if value is None:
        return True
    text = value.strip()
    return text == "" or bool(USER_TEXT_PATTERN.fullmatch(text))


def is_valid_user_text(value: str | None) -> bool:
    """Required non-empty text with only allowlisted characters."""
    if value is None:
        return False
    text = value.strip()
    return len(text) > 0 and bool(USER_TEXT_PATTERN.fullmatch(text))


def filter_allowed_user_text(value: str | None) -> str:
    if not value:
        return ""
    return USER_TEXT_STRIP.sub("", value)


def validate_allowed_user_text(value: Any) -> str | None:
    """Pydantic field_validator helper: None/blank -> None; else enforce allowlist."""
    if value is None:
        return None
    if not isinstance(value, str):
        value = str(value)
    cleaned = value.strip()
    if cleaned == "":
        return None
    if not USER_TEXT_PATTERN.fullmatch(cleaned):
        raise ValueError(INVALID_CHARS_MESSAGE)
    return cleaned


def validate_required_allowed_user_text(value: Any) -> str:
    """Pydantic field_validator helper for required free-text fields."""
    if value is None or (isinstance(value, str) and not value.strip()):
        raise ValueError("Este campo es obligatorio")
    text = value.strip() if isinstance(value, str) else str(value).strip()
    if not USER_TEXT_PATTERN.fullmatch(text):
        raise ValueError(INVALID_CHARS_MESSAGE)
    return text
