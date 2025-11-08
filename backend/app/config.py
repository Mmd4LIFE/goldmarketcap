import secrets
from functools import lru_cache
from typing import Optional

from pydantic import BaseSettings, Field, HttpUrl, validator


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    database_url: str = Field(
        ...,
        env="DATABASE_URL",
        description="SQLAlchemy database URL (e.g. postgresql+psycopg://user:pass@host:5432/dbname)",
    )
    collector_interval_seconds: int = Field(
        60,
        ge=15,
        le=3600,
        env="COLLECTOR_INTERVAL_SECONDS",
        description="Interval in seconds between gold price collections",
    )
    http_timeout_seconds: int = Field(
        30,
        ge=5,
        le=120,
        env="HTTP_TIMEOUT_SECONDS",
        description="HTTP client timeout for upstream gold price requests",
    )

    api_bearer_token: str = Field(
        default_factory=lambda: secrets.token_urlsafe(32),
        env="API_BEARER_TOKEN",
        description="Bearer token required for external API access",
    )
    telegram_bearer_token: Optional[str] = Field(
        None,
        env="TELEGRAM_BEARER_TOKEN",
        description="Bearer token dedicated for Telegram bot integration",
    )

    allowed_origins: list[str] = Field(
        default=["*"],
        env="ALLOWED_ORIGINS",
        description="List of allowed CORS origins (comma-separated).",
    )
    log_level: str = Field(
        "INFO",
        env="LOG_LEVEL",
        description="Logging level for the application",
    )

    milli_api_url: HttpUrl = Field(
        "https://milli.gold/api/v1/public/milli-price/detail", env="MILLI_API_URL"
    )
    taline_api_url: HttpUrl = Field(
        "https://price.tlyn.ir/api/v1/price", env="TALINE_API_URL"
    )
    digikala_api_url: HttpUrl = Field(
        "https://api.digikala.com/non-inventory/v1/prices/", env="DIGIKALA_API_URL"
    )
    talasea_api_url: HttpUrl = Field(
        "https://api.talasea.ir/api/market/getGoldPrice", env="TALASEA_API_URL"
    )
    tgju_api_url: HttpUrl = Field(
        "https://studio.persianapi.com/index.php/web-service/common/gold-currency-coin?format=json&limit=30&page=1",
        env="TGJU_API_URL",
    )
    tgju_api_token: Optional[str] = Field(None, env="TGJU_API_TOKEN")
    wallgold_api_url: HttpUrl = Field(
        "https://api.wallgold.ir/api/v1/markets", env="WALLGOLD_API_URL"
    )
    technogold_api_url: HttpUrl = Field(
        "https://api2.technogold.gold/customer/tradeables/only-price/1",
        env="TECHNOGOLD_API_URL",
    )
    melligold_api_url: HttpUrl = Field(
        "https://melligold.com/api/v1/exchange/buy-sell-price/",
        env="MELLIGOLD_API_URL",
    )
    daric_api_url: HttpUrl = Field(
        "https://apisc.daric.gold/loan/api/v1/User/Collateral/GetGoldlPrice",
        env="DARIC_API_URL",
    )
    goldika_api_url: HttpUrl = Field(
        "https://goldika.ir/api/public/price", env="GOLDIKA_API_URL"
    )
    estjt_api_url: HttpUrl = Field(
        "https://www.estjt.ir/tv/", env="ESTJT_API_URL"
    )

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"

        @classmethod
        def parse_env_var(cls, field_name: str, raw_value: str):
            # Let the validator handle comma separated origins instead of forcing JSON.
            if field_name == "allowed_origins":
                return raw_value
            return super().parse_env_var(field_name, raw_value)

    @validator("allowed_origins", pre=True)
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings instance."""

    return Settings()

