from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from bson import ObjectId
from db import get_db
from routes.auth import get_current_user, get_optional_user

router = APIRouter()

class SessionSaveRequest(BaseModel):
    query: str
    session_data: Any       # full session blob (rootAnswer, stack, graphNodes, etc.)
    bookmarked: bool = False

class SessionUpdateRequest(BaseModel):
    session_data: Any
    bookmarked: Optional[bool] = None

def _fmt(doc) -> dict:
    doc["id"] = str(doc.pop("_id"))
    doc["user_id"] = str(doc.get("user_id", ""))
    return doc

# ── Save / upsert a session ───────────────────────────
@router.post("/sessions/save")
def save_session(body: SessionSaveRequest, user=Depends(get_current_user)):
    db = get_db()
    existing = db.sessions.find_one({"user_id": ObjectId(user["sub"]), "query": body.query})
    if existing:
        db.sessions.update_one(
            {"_id": existing["_id"]},
            {"$set": {"session_data": body.session_data, "updated_at": datetime.utcnow(),
                      "bookmarked": body.bookmarked}}
        )
        return {"id": str(existing["_id"]), "updated": True}
    result = db.sessions.insert_one({
        "user_id": ObjectId(user["sub"]),
        "query": body.query,
        "session_data": body.session_data,
        "bookmarked": body.bookmarked,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return {"id": str(result.inserted_id), "updated": False}

# ── List all sessions for the user ───────────────────
@router.get("/sessions/list")
def list_sessions(user=Depends(get_current_user)):
    db = get_db()
    docs = list(db.sessions.find(
        {"user_id": ObjectId(user["sub"])},
        {"session_data": 0}          # exclude heavy payload from list view
    ).sort("updated_at", -1).limit(50))
    return [_fmt(d) for d in docs]

# ── Get a single session by ID (public — for share links) ─
@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    db = get_db()
    try:
        doc = db.sessions.find_one({"_id": ObjectId(session_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return _fmt(doc)

# ── Toggle bookmark ───────────────────────────────────
@router.patch("/sessions/{session_id}/bookmark")
def toggle_bookmark(session_id: str, user=Depends(get_current_user)):
    db = get_db()
    doc = db.sessions.find_one({"_id": ObjectId(session_id), "user_id": ObjectId(user["sub"])})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    new_val = not doc.get("bookmarked", False)
    db.sessions.update_one({"_id": ObjectId(session_id)}, {"$set": {"bookmarked": new_val}})
    return {"bookmarked": new_val}

# ── Delete a session ──────────────────────────────────
@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user=Depends(get_current_user)):
    db = get_db()
    db.sessions.delete_one({"_id": ObjectId(session_id), "user_id": ObjectId(user["sub"])})
    return {"deleted": True}
