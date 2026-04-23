from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # 인프라 접속
    DATABASE_URL: str
    DATABASE_URL_SYNC: str
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"

    # 암호학적 시크릿
    JWT_SIGNING_SECRET: str
    SESSION_SECRET: str
    FERNET_KEY: str
    CAFE24_WEBHOOK_SECRET: str = ""

    # 부팅 런타임
    ENV: Literal["dev", "stage", "prod"] = "dev"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    LOG_LEVEL: str = "DEBUG"

    # 프론트엔드
    FRONTEND_URL: str = "http://localhost:3000"

    # 관찰성
    SENTRY_DSN: str = ""
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""

    # 최초 관리자 시드
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@omnicommerce.local"
    BOOTSTRAP_ADMIN_PASSWORD: str = ""

    @property
    def is_dev(self) -> bool:
        return self.ENV == "dev"

    @property
    def is_prod(self) -> bool:
        return self.ENV == "prod"


settings = Settings()  # type: ignore[call-arg]
