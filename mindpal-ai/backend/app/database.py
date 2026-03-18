"""
MongoDB connection and database helpers.
Uses real MongoDB if MONGODB_URI is set and USE_IN_MEMORY_DB is False; otherwise in-memory.
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings
from app.database_memory import get_memory_db

_settings = get_settings()
_client: AsyncIOMotorClient | None = None


def _use_memory_db() -> bool:
    """Use in-memory DB when explicitly set, or when no MONGODB_URI in env (default)."""
    if os.environ.get("USE_IN_MEMORY_DB", "").lower() in ("true", "1"):
        return True
    if os.environ.get("MONGODB_URI"):
        return False
    return _settings.USE_IN_MEMORY_DB


async def get_db():
    """Return MongoDB database or in-memory database."""
    if _use_memory_db():
        return get_memory_db()
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(_settings.MONGODB_URI)
    return _client[_settings.MONGODB_DB]


async def close_db():
    """Close MongoDB connection (no-op when using in-memory DB)."""
    global _client
    if _client:
        _client.close()
        _client = None
