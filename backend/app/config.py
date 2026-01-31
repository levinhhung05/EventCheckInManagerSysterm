"""
Configuration settings for the Event Check-in Management System.
Uses pydantic-settings for environment variable management.
"""
from typing import List
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Event Check-in Management System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "change-this-to-a-random-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS
    # ALWAYS a list[str] inside the app
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Data Storage
    DATA_DIR: Path = Path("./data")

    # Performance
    CACHE_SIZE: int = 1000
    FILE_LOCK_TIMEOUT: int = 10

    # Limits
    MAX_TABLES_PER_EVENT: int = 500
    MAX_SEATS_PER_EVENT: int = 5000
    MAX_GUESTS_PER_EVENT: int = 10000
    MAX_CONCURRENT_STAFF: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True

    # Parse env string -> list[str] safely
    @classmethod
    def parse_env_var(cls, field_name: str, raw_value: str):
        if field_name == "CORS_ORIGINS":
            return [v.strip() for v in raw_value.split(",") if v.strip()]
        return raw_value


settings = Settings()

# Ensure data directories exist (Windows-safe)
settings.DATA_DIR = settings.DATA_DIR.resolve()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
(settings.DATA_DIR / "events").mkdir(exist_ok=True)
