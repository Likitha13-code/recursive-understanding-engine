from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from bson import ObjectId
from db import get_db
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET = os.getenv("JWT_SECRET", "rue-secret")
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "720"))

# ── Models ────────────────────────────────────────────
class AuthRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str

# ── Helpers ───────────────────────────────────────────
def make_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return decode_token(creds.credentials)

def get_optional_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        return None
    try:
        return decode_token(creds.credentials)
    except Exception:
        return None

# ── Routes ────────────────────────────────────────────
@router.post("/auth/register", response_model=AuthResponse)
def register(body: AuthRequest):
    db = get_db()
    if db.users.find_one({"email": body.email}):
        raise HTTPException(status_code=409, detail="Email already registered")
    result = db.users.insert_one({
        "email": body.email,
        "password_hash": pwd.hash(body.password),
        "created_at": datetime.utcnow(),
    })
    user_id = str(result.inserted_id)
    return AuthResponse(token=make_token(user_id, body.email), user_id=user_id, email=body.email)

@router.post("/auth/login", response_model=AuthResponse)
def login(body: AuthRequest):
    db = get_db()
    user = db.users.find_one({"email": body.email})
    if not user or not pwd.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    return AuthResponse(token=make_token(user_id, body.email), user_id=user_id, email=body.email)

@router.get("/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user["sub"], "email": current_user["email"]}
