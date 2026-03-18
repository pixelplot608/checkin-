"""
User profile route.
"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.api.deps import get_current_user_id

router = APIRouter(prefix="/user", tags=["User"])


@router.get("/me")
async def get_me(user_id: str = Depends(get_current_user_id), db=Depends(get_db)):
    from bson import ObjectId
    try:
        oid = ObjectId(user_id)
    except Exception:
        oid = user_id
    user = await db.users.find_one({"_id": oid})
    if not user:
        return None
    uid = str(user["_id"])
    return {
        "id": uid,
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
    }
