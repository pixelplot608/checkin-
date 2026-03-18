"""
Auth routes: signup, login.
"""
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.models.user import UserCreate, UserResponse
from app.models.auth import Token, LoginRequest
from app.services.auth_service import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=Token)
async def signup(data: UserCreate, db=Depends(get_db)):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": data.email,
        "full_name": data.full_name,
        "hashed_password": hash_password(data.password),
        "created_at": None,  # set below
    }
    from datetime import datetime
    doc["created_at"] = datetime.utcnow()
    r = await db.users.insert_one(doc)
    user_id = str(r.inserted_id)
    user_response = {
        "id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "created_at": doc["created_at"].isoformat() if doc["created_at"] else None,
    }
    token = create_access_token({"sub": user_id})
    return Token(access_token=token, user=user_response)


@router.post("/login", response_model=Token)
async def login(data: LoginRequest, db=Depends(get_db)):
    user = await db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    from datetime import datetime
    user_response = {
        "id": user_id,
        "email": user["email"],
        "full_name": user.get("full_name"),
        "created_at": user["created_at"].isoformat() if user.get("created_at") else None,
    }
    token = create_access_token({"sub": user_id})
    return Token(access_token=token, user=user_response)
