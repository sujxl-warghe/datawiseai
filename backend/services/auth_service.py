import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY     = os.getenv("JWT_SECRET", "datawise-super-secret-key-change-in-production")
ALGORITHM      = "HS256"
ACCESS_EXPIRE  = int(os.getenv("JWT_EXPIRE_HOURS", 24))


# ── Password ───────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ── JWT ────────────────────────────────────────────────────────────

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub":   user_id,
        "email": email,
        "iat":   datetime.utcnow(),
        "exp":   datetime.utcnow() + timedelta(hours=ACCESS_EXPIRE),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ── User helpers ───────────────────────────────────────────────────

def sanitize_user(doc: dict) -> dict:
    """Remove sensitive fields before returning user to frontend."""
    doc = dict(doc)
    doc.pop("_id",      None)
    doc.pop("password", None)
    return doc
