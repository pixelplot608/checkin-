"""
MindPal AI - FastAPI application entry point.
All API routes are under /api prefix.
"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import close_db
from app.api.routes import (
    auth,
    user,
    baseline,
    mood,
    journal,
    emotion_snap,
    behavior,
    risk,
    chat,
    dashboard,
    consent,
    trusted_contact,
    emotional_baseline,
    companion_character,
    forest,
    reflection_30d,
    support,
    daily_snap,
    onboarding,
    profile,
)

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Multimodal Emotional Companion & Mental Health Early Warning",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print("REGISTERING ROUTES...")

for r in [
    auth, user, baseline, mood, journal,
    emotion_snap, behavior, risk, chat, dashboard,
    consent, trusted_contact, emotional_baseline, companion_character, forest,
    reflection_30d,
    support,
    daily_snap,
    onboarding,
    profile,
]:
    print("Loaded:", r.__name__)

# All backend APIs under /api
app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(baseline.router, prefix="/api")
app.include_router(mood.router, prefix="/api")
app.include_router(journal.router, prefix="/api")
app.include_router(emotion_snap.router, prefix="/api")
app.include_router(behavior.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(consent.router, prefix="/api")
app.include_router(trusted_contact.router, prefix="/api")
app.include_router(emotional_baseline.router, prefix="/api")
app.include_router(companion_character.router, prefix="/api")
app.include_router(forest.router, prefix="/api")
app.include_router(reflection_30d.router, prefix="/api")
app.include_router(support.router, prefix="/api")
app.include_router(daily_snap.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(profile.router, prefix="/api")

# Serve uploaded snap images at /api/uploads/snaps/...
_uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")


def _print_routes():
    """Print all registered API routes at startup (from OpenAPI)."""
    openapi = app.openapi()
    for path, methods in (openapi.get("paths") or {}).items():
        if not path.startswith("/api"):
            continue
        for method in methods:
            if method.lower() in ("get", "post", "put", "delete", "patch"):
                print(f"  {method.upper():6} {path}")


@app.get("/")
async def root():
    return {"app": settings.APP_NAME, "status": "ok"}


@app.on_event("shutdown")
async def shutdown():
    await close_db()


print("\n===== REGISTERED API ROUTES =====")
_print_routes()
print("===== END ROUTES =====\n")
