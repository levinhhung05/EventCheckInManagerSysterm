"""
Configuration settings for the Event Check-in Management System.
Uses pydantic-settings for environment variable management.
"""
from typing import List, Union
from pathlib import Path
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ==========================================================================
    # Application Info
    # ==========================================================================
    APP_NAME: str = "Event Check-in Management System"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ==========================================================================
    # Security
    # ==========================================================================
    # WARN: Change this in production!
    SECRET_KEY: str = "change-this-to-a-random-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ==========================================================================
    # CORS (Cross-Origin Resource Sharing)
    # ==========================================================================
    # Updated: Added "*" to support Mobile/LAN development without IP restrictions.
    # In production, specify exact domains.
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite Local
        "http://localhost:3000",  # React Local
        "*",                      # ALLOW ALL (Crucial for Mobile/LAN testing)
    ]

    # ==========================================================================
    # Data Storage
    # ==========================================================================
    DATA_DIR: Path = Path("./data")

    # ==========================================================================
    # Performance & Limits
    # ==========================================================================
    CACHE_SIZE: int = 1000
    FILE_LOCK_TIMEOUT: int = 10
    
    MAX_TABLES_PER_EVENT: int = 500
    MAX_SEATS_PER_EVENT: int = 5000
    MAX_GUESTS_PER_EVENT: int = 10000
    MAX_CONCURRENT_STAFF: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True

    # --------------------------------------------------------------------------
    # Validators
    # --------------------------------------------------------------------------
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """
        Parses a comma-separated string into a list of strings.
        Example in .env: CORS_ORIGINS=http://localhost:5173,http://192.168.1.5:5173
        """
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return v
        raise ValueError(v)


# Instantiate settings
settings = Settings()

# ==============================================================================
# Initialization Logic
# ==============================================================================
# Ensure data directories exist (OS-agnostic & Windows-safe)
try:
    settings.DATA_DIR = settings.DATA_DIR.resolve()
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    (settings.DATA_DIR / "events").mkdir(exist_ok=True)
    # print(f"[*] Data directory initialized at: {settings.DATA_DIR}")
except Exception as e:
    print(f"[!] Critical Error: Could not create data directory. {e}")