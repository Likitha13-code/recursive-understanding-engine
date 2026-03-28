from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from db import get_db
from dotenv import load_dotenv
import uuid, os

load_dotenv()

router = APIRouter()
bearer = HTTPBearer(auto_error=False)
pwd = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

SECRET = os.getenv("JWT_SECRET", "rue-secret")
EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "720"))

class AuthRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str

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

@router.post("/auth/register", response_model=AuthResponse)
def register(body: AuthRequest):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
    if cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")
    user_id = str(uuid.uuid4())
    cur.execute(
        "INSERT INTO users (id, email, password_hash, created_at) VALUES (%s, %s, %s, %s)",
        (user_id, body.email, pwd.hash(body.password), datetime.utcnow().isoformat())
    )
    conn.commit(); cur.close(); conn.close()
    return AuthResponse(token=make_token(user_id, body.email), user_id=user_id, email=body.email)

@router.post("/auth/login", response_model=AuthResponse)
def login(body: AuthRequest):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (body.email,))
    user = cur.fetchone(); cur.close(); conn.close()
    if not user or not pwd.verify(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return AuthResponse(token=make_token(user["id"], body.email), user_id=user["id"], email=body.email)

@router.get("/auth/me")
def me(current_user: dict = Depends(get_current_user)):
    return {"user_id": current_user["sub"], "email": current_user["email"]}
