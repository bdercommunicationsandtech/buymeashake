from typing import Any
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class DomainException(Exception):
    """Excepción base de dominio."""
    def __init__(self, message: str, code: str = "DOMAIN_ERROR", details: dict[str, Any] | None = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(message)


class EntityNotFoundError(DomainException):
    def __init__(self, entity_name: str, identifier: Any):
        super().__init__(
            message=f"{entity_name} not found.",
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
    def __init__(self, message: str = "Invalid credentials or session expired."):
        super().__init__(message=message, code="UNAUTHORIZED")


class ForbiddenError(DomainException):
    def __init__(self, message: str = "Forbidden: you do not have permission for this action."):
        super().__init__(message=message, code="FORBIDDEN")


class RateLimitExceededError(DomainException):
    def __init__(self, wait_seconds: int = 60, message: str | None = None):
        msg = message or f"Please wait {wait_seconds} seconds before requesting a new code."
        super().__init__(
            message=msg,
            code="RATE_LIMIT_EXCEEDED",
            details={"wait_seconds": wait_seconds},
        )


class PaymentProcessingError(DomainException):
    def __init__(self, message: str = "Payment processing failed.", details: dict[str, Any] | None = None):
        super().__init__(message=message, code="PAYMENT_ERROR", details=details)


def register_exception_handlers(app: FastAPI) -> None:
    """Registra los manejadores globales de excepciones de dominio en FastAPI."""
    
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
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Unexpected server error.",
                    "details": {"type": type(exc).__name__, "detail": str(exc)},
                }
            },
        )
