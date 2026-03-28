from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from db import get_db
from routes.auth import get_current_user
import uuid, json

router = APIRouter()

class SessionSaveRequest(BaseModel):
    query: str
    session_data: Any
    bookmarked: bool = False

@router.post("/sessions/save")
def save_session(body: SessionSaveRequest, user=Depends(get_current_user)):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM sessions WHERE user_id = %s AND query = %s", (user["sub"], body.query))
    existing = cur.fetchone()
    now = datetime.utcnow().isoformat()
    data_str = json.dumps(body.session_data)
    if existing:
        cur.execute(
            "UPDATE sessions SET session_data=%s, bookmarked=%s, updated_at=%s WHERE id=%s",
            (data_str, body.bookmarked, now, existing["id"])
        )
        conn.commit(); cur.close(); conn.close()
        return {"id": existing["id"], "updated": True}
    session_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO sessions (id, user_id, query, session_data, bookmarked, created_at, updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s)",
        (session_id, user["sub"], body.query, data_str, body.bookmarked, now, now)
    )
    conn.commit(); cur.close(); conn.close()
    return {"id": session_id, "updated": False}

@router.get("/sessions/list")
def list_sessions(user=Depends(get_current_user)):
    conn = get_db(); cur = conn.cursor()
    cur.execute(
        "SELECT id, user_id, query, bookmarked, updated_at FROM sessions WHERE user_id = %s ORDER BY updated_at DESC LIMIT 50",
        (user["sub"],)
    )
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]

@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT * FROM sessions WHERE id = %s", (session_id,))
    row = cur.fetchone(); cur.close(); conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    result = dict(row)
    result["session_data"] = json.loads(result["session_data"])
    return result

@router.patch("/sessions/{session_id}/bookmark")
def toggle_bookmark(session_id: str, user=Depends(get_current_user)):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT bookmarked FROM sessions WHERE id=%s AND user_id=%s", (session_id, user["sub"]))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Session not found")
    new_val = not row["bookmarked"]
    cur.execute("UPDATE sessions SET bookmarked=%s WHERE id=%s", (new_val, session_id))
    conn.commit(); cur.close(); conn.close()
    return {"bookmarked": new_val}

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, user=Depends(get_current_user)):
    conn = get_db(); cur = conn.cursor()
    cur.execute("DELETE FROM sessions WHERE id=%s AND user_id=%s", (session_id, user["sub"]))
    conn.commit(); cur.close(); conn.close()
    return {"deleted": True}
