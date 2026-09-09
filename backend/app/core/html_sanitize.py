"""HTML sanitization for user-generated rich content (posts).

Uses only the Python stdlib (html.parser) — no external deps.
Allows a tight tag/attr allowlist and http(s) URLs only.
"""

from __future__ import annotations

from html import escape
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse


ALLOWED_TAGS = frozenset(
    {
        "p",
        "br",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "h1",
        "h2",
        "h3",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "img",
    }
)

VOID_TAGS = frozenset({"br", "img"})

ALLOWED_ATTRS: dict[str, frozenset[str]] = {
    "a": frozenset({"href", "title", "rel", "target"}),
    "img": frozenset({"src", "alt", "loading", "width", "height"}),
}


def _is_safe_http_url(value: str) -> bool:
    """Allow absolute http(s) URLs and same-origin /static upload paths."""
    raw = value.strip()
    if not raw or raw.startswith("//") or "\\" in raw:
        return False
    # Uploaded media is stored/served under /static/...
    if raw.startswith("/static/") and "://" not in raw and ".." not in raw:
        return True
    try:
        parsed = urlparse(raw)
    except Exception:
        return False
    if parsed.scheme.lower() not in {"http", "https"}:
        return False
    return bool(parsed.netloc)


class _PostHtmlSanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._parts: list[str] = []
        self._open_stack: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        name = tag.lower()
        if self._skip_depth > 0:
            if name not in VOID_TAGS:
                self._skip_depth += 1
            return
        if name not in ALLOWED_TAGS:
            if name not in VOID_TAGS:
                self._skip_depth += 1
            return

        allowed = ALLOWED_ATTRS.get(name, frozenset())
        safe_attrs: list[str] = []
        for key, raw in attrs:
            attr = key.lower()
            if attr not in allowed or raw is None:
                continue
            value = raw.strip()
            if attr in {"href", "src"} and not _is_safe_http_url(value):
                continue
            if attr == "target" and value not in {"_blank", "_self"}:
                continue
            if attr == "rel" and value not in {"noopener", "noreferrer", "noopener noreferrer"}:
                continue
            if attr == "loading" and value not in {"lazy", "eager"}:
                continue
            safe_attrs.append(f'{attr}="{escape(value, quote=True)}"')

        if name == "a" and not any(a.startswith('href="') for a in safe_attrs):
            self._skip_depth += 1
            return
        if name == "img" and not any(a.startswith('src="') for a in safe_attrs):
            return

        attr_str = (" " + " ".join(safe_attrs)) if safe_attrs else ""
        if name in VOID_TAGS:
            self._parts.append(f"<{name}{attr_str} />")
            return

        self._parts.append(f"<{name}{attr_str}>")
        self._open_stack.append(name)

    def handle_endtag(self, tag: str) -> None:
        name = tag.lower()
        if self._skip_depth > 0:
            if name not in VOID_TAGS:
                self._skip_depth -= 1
            return
        if name not in ALLOWED_TAGS or name in VOID_TAGS:
            return
        if name not in self._open_stack:
            return
        while self._open_stack:
            opened = self._open_stack.pop()
            self._parts.append(f"</{opened}>")
            if opened == name:
                break

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0 or not data:
            return
        self._parts.append(escape(data, quote=False))

    def handle_entityref(self, name: str) -> None:
        if self._skip_depth > 0:
            return
        self._parts.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if self._skip_depth > 0:
            return
        self._parts.append(f"&#{name};")

    def get_html(self) -> str:
        while self._open_stack:
            opened = self._open_stack.pop()
            self._parts.append(f"</{opened}>")
        return "".join(self._parts).strip()


def sanitize_post_html(value: Any) -> str:
    """Strip unsafe tags/attrs/protocols from post HTML. Raises if empty after clean."""
    if value is None:
        raise ValueError("El contenido es obligatorio")
    raw = value if isinstance(value, str) else str(value)
    if not raw.strip():
        raise ValueError("El contenido es obligatorio")

    parser = _PostHtmlSanitizer()
    parser.feed(raw)
    parser.close()
    cleaned = parser.get_html()
    if not cleaned:
        raise ValueError("El contenido es obligatorio")
    return cleaned
