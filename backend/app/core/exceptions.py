import logging
from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class DomainException(Exception):
    """Excepción base de dominio."""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR", details: dict[str, Any] | None = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)


class EntityNotFoundError(DomainException):
    def __init__(self, entity_name: str, identifier: Any, message: str | None = None):
        msg = message or f"{entity_name} not found."
        super().__init__(
            message=msg,
            code="ENTITY_NOT_FOUND",
            details={"entity": entity_name, "identifier": str(identifier)},
        )


class EntityAlreadyExistsError(DomainException):
    def __init__(self, entity_name: str, field: str, value: Any):
        super().__init__(
            message=f"{entity_name} with {field} '{value}' already exists.",
            code="ENTITY_ALREADY_EXISTS",
            details={"entity": entity_name, "field": field, "value": str(value)},
        )


class UnauthorizedError(DomainException):
    def __init__(self, message: str = "Invalid credentials or session expired.", details: dict[str, Any] | None = None):
        super().__init__(message=message, code="UNAUTHORIZED", details=details)


class ForbiddenError(DomainException):
    def __init__(self, message: str = "Forbidden: you do not have permission for this action."):
        super().__init__(message=message, code="FORBIDDEN")


class RateLimitExceededError(DomainException):
    def __init__(self, wait_seconds: int = 60, message: str | None = None):
        msg = message or f"Please wait {wait_seconds} seconds before requesting a new code."
        super().__init__(
            message=msg,
            code="RATE_LIMIT_EXCEEDED",
            details={"wait_seconds": wait_seconds, "has_active_otp": True},
        )


class PaymentProcessingError(DomainException):
    def __init__(self, message: str = "Payment processing failed.", details: dict[str, Any] | None = None):
        super().__init__(message=message, code="PAYMENT_ERROR", details=details)


class BusinessLogicError(DomainException):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, code="BUSINESS_LOGIC_ERROR", details=details)


class NeedsRoleError(DomainException):
    """Usuario social nuevo: el cliente debe elegir athlete o supporter."""

    def __init__(self, email: str, full_name: str):
        super().__init__(
            message="Elige si quieres ser atleta o apoyar a tus atletas favoritos.",
            code="NEEDS_ROLE",
            details={
                "needs_role": True,
                "email": email,
                "full_name": full_name,
            },
        )


def _first_validation_message(exc: RequestValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "Datos inválidos."
    first = errors[0]
    msg = str(first.get("msg") or "Datos inválidos.")
    if msg.lower().startswith("value error,"):
        msg = msg.split(",", 1)[1].strip()
    return msg


def _json_safe_validation_errors(exc: RequestValidationError) -> list[dict[str, Any]]:
    """Pydantic may embed exception objects in error ctx; keep only JSON-safe data."""
    safe: list[dict[str, Any]] = []
    for item in exc.errors():
        entry: dict[str, Any] = {
            "type": item.get("type"),
            "loc": list(item.get("loc") or ()),
            "msg": item.get("msg"),
        }
        input_value = item.get("input")
        if isinstance(input_value, (str, int, float, bool)) or input_value is None:
            entry["input"] = input_value
        elif input_value is not None:
            entry["input"] = str(input_value)[:200]
        safe.append(entry)
    return safe


def register_exception_handlers(app: FastAPI) -> None:
    """Registra los manejadores globales de excepciones de dominio en FastAPI."""

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        message = _first_validation_message(exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": message,
                    "details": {"errors": _json_safe_validation_errors(exc)},
                }
            },
        )

    @app.exception_handler(EntityNotFoundError)
    async def entity_not_found_handler(request: Request, exc: EntityNotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(EntityAlreadyExistsError)
    async def entity_exists_handler(request: Request, exc: EntityAlreadyExistsError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(NeedsRoleError)
    async def needs_role_handler(request: Request, exc: NeedsRoleError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(request: Request, exc: UnauthorizedError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_handler(request: Request, exc: ForbiddenError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(RateLimitExceededError)
    async def rate_limit_handler(request: Request, exc: RateLimitExceededError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(PaymentProcessingError)
    async def payment_error_handler(request: Request, exc: PaymentProcessingError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(DomainException)
    async def general_domain_handler(request: Request, exc: DomainException) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        from app.core.config import settings

        logger.exception("Excepción no controlada en la petición %s %s: %s", request.method, request.url.path, exc)

        is_dev = getattr(settings, "ENVIRONMENT", "development").lower() == "development"
        details = {"type": type(exc).__name__, "detail": str(exc)} if is_dev else {}

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Unexpected server error." if is_dev else "Ha ocurrido un error inesperado en el servidor.",
                    "details": details,
                }
            },
        )
