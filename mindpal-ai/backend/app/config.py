"""
App configuration and environment variables.
"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment."""
    # App
    APP_NAME: str = "MindPal AI"
    DEBUG: bool = True
    DEMO_MODE: bool = True  # Use simulated AI when True

    # MongoDB (set USE_IN_MEMORY_DB=true to run without MongoDB)
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "mindpal"
    USE_IN_MEMORY_DB: bool = True  # True = no MongoDB needed (data lost on restart)

    # JWT
    JWT_SECRET: str = "mindpal-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # External APIs
    GOOGLE_MAPS_API_KEY: str | None = None

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
