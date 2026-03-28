from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from db import get_db
from dotenv import load_dotenv
import uuid, os, smtplib
from email.mime.text import MIMEText

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

# ── Forgot Password ──────────────────────────────────
class ForgotRequest(BaseModel):
    email: str

class ResetRequest(BaseModel):
    token: str
    new_password: str

def send_reset_email(to_email: str, reset_link: str):
    gmail_user = os.getenv("GMAIL_USER")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD")
    if not gmail_user or not gmail_pass:
        return  # silently skip if email not configured
    msg = MIMEText(
        f"Hi,\n\nClick the link below to reset your RUE password:\n\n{reset_link}\n\n"
        f"This link expires in 1 hour. If you didn't request this, ignore this email.\n\n— RUE Team"
    )
    msg["Subject"] = "Reset your RUE password"
    msg["From"] = gmail_user
    msg["To"] = to_email
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(gmail_user, gmail_pass)
            s.sendmail(gmail_user, to_email, msg.as_string())
    except Exception:
        pass  # don't crash if email fails

@router.post("/auth/forgot-password")
def forgot_password(body: ForgotRequest):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
    user = cur.fetchone()
    # Always return success (don't reveal if email exists)
    if not user:
        cur.close(); conn.close()
        return {"message": "If that email exists, a reset link has been sent."}
    token = str(uuid.uuid4())
    expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    cur.execute(
        "INSERT INTO password_reset_tokens (token, user_id, expires_at, used) VALUES (%s, %s, %s, FALSE)",
        (token, user["id"], expires)
    )
    conn.commit(); cur.close(); conn.close()
    frontend_url = os.getenv("FRONTEND_URL", "https://recursive-understanding-engine-c0flsmnlo.vercel.app")
    reset_link = f"{frontend_url}/reset-password?token={token}"
    send_reset_email(body.email, reset_link)
    return {"message": "If that email exists, a reset link has been sent."}

@router.post("/auth/reset-password")
def reset_password(body: ResetRequest):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT * FROM password_reset_tokens WHERE token = %s", (body.token,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if row["used"]:
        cur.close(); conn.close()
        raise HTTPException(status_code=400, detail="Reset link already used")
    if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
        cur.close(); conn.close()
        raise HTTPException(status_code=400, detail="Reset link has expired")
    cur.execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (pwd.hash(body.new_password), row["user_id"])
    )
    cur.execute("UPDATE password_reset_tokens SET used = TRUE WHERE token = %s", (body.token,))
    conn.commit(); cur.close(); conn.close()
    return {"message": "Password reset successfully"}
