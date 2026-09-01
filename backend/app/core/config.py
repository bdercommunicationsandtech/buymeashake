from typing import Any

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _strip_wrapping_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


class Settings(BaseSettings):
    PROJECT_NAME: str = "buymeashake API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:3000",
        "https://buymeashake.fit",
    ]

    # Database (misma convención que buyer1/services)
    DATABASE: str = Field(
        default="buymeashake",
        validation_alias=AliasChoices("DATABASE", "DB_NAME"),
    )
    USER_DB: str = Field(
        default="root",
        validation_alias=AliasChoices("USER_DB", "DB_USER"),
    )
    HOST: str = Field(
        default="localhost",
        validation_alias=AliasChoices("HOST", "DB_HOST"),
    )
    PASSWORD: str = Field(
        default="root",
        validation_alias=AliasChoices("PASSWORD", "DB_PASSWORD"),
    )
    PORT_DB: int = Field(
        default=3306,
        validation_alias=AliasChoices("PORT_DB", "DB_PORT"),
    )

    @field_validator("PASSWORD", mode="before")
    @classmethod
    def normalize_password(cls, value: Any) -> Any:
        if isinstance(value, str):
            return _strip_wrapping_quotes(value)
        return value

    # JWT Security
    SECRET_KEY: str = "SUPER_SECRET_KEY_CHANGE_IN_PRODUCTION_982347891234"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 días

    # Stripe
    STRIPE_SECRET_KEY: str = "sk_test_placeholder"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_placeholder"
    STRIPE_WEBHOOK_SECRET: str = "whsec_placeholder"
    PLATFORM_FEE_PERCENTAGE: float = 0.05  # 5% comisión plataforma

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
        populate_by_name=True,
    )


settings = Settings()
