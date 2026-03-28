import sys, os; sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

from utils.database import get_db
from services.auth_service import (
    hash_password, verify_password,
    create_token, decode_token, sanitize_user
)

router  = APIRouter()
bearer  = HTTPBearer(auto_error=False)


# ── Request Models ─────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name:       str
    email:      str
    password:   str
    institution: Optional[str] = ""
    role:        Optional[str] = "student"   # student | researcher | professional


class LoginRequest(BaseModel):
    email:    str
    password: str


class UpdateProfileRequest(BaseModel):
    name:        Optional[str] = None
    institution: Optional[str] = None
    role:        Optional[str] = None
    groq_api_key:Optional[str] = None


# ── Auth Dependency ────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer)
):
    if not credentials:
        raise HTTPException(401, "Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(401, "Token expired or invalid")

    db  = get_db()
    if db is None:
        # DB not available — return minimal user from token
        return {"user_id": payload["sub"], "email": payload["email"]}

    user = await db.users.find_one({"user_id": payload["sub"]})
    if not user:
        raise HTTPException(401, "User not found")

    return sanitize_user(user)


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(bearer)
):
    """Returns user if authenticated, else None."""
    try:
        return await get_current_user(credentials)
    except Exception:
        return None


# ── Endpoints ──────────────────────────────────────────────────────

@router.post("/signup")
async def signup(request: SignupRequest):
    """Register a new user."""
    db = get_db()

    # Validate
    if len(request.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if len(request.name.strip()) < 2:
        raise HTTPException(400, "Name must be at least 2 characters")

    if db is not None:
        # Check duplicate email
        existing = await db.users.find_one({"email": request.email.lower()})
        if existing:
            raise HTTPException(409, "Email already registered")

    user_id  = str(uuid.uuid4())
    hashed   = hash_password(request.password)
    now      = datetime.utcnow()

    user_doc = {
        "user_id":     user_id,
        "name":        request.name.strip(),
        "email":       request.email.lower().strip(),
        "password":    hashed,
        "institution": request.institution or "",
        "role":        request.role or "student",
        "groq_api_key":"",
        "avatar":      request.name.strip()[0].upper(),   # initials avatar
        "created_at":  now,
        "updated_at":  now,
    }

    if db is not None:
        await db.users.insert_one(user_doc)

    token = create_token(user_id, request.email.lower())

    return {
        "token": token,
        "user":  sanitize_user(user_doc),
    }


@router.post("/login")
async def login(request: LoginRequest):
    """Login with email and password."""
    db = get_db()

    if db is None:
        raise HTTPException(503, "Database unavailable — cannot login")

    user = await db.users.find_one({"email": request.email.lower().strip()})
    if not user:
        raise HTTPException(401, "Invalid email or password")

    if not verify_password(request.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")

    token = create_token(user["user_id"], user["email"])

    return {
        "token": token,
        "user":  sanitize_user(user),
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update user profile."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    updates = {"updated_at": datetime.utcnow()}
    if request.name:        updates["name"]         = request.name.strip()
    if request.institution is not None: updates["institution"]  = request.institution
    if request.role:        updates["role"]         = request.role
    if request.groq_api_key is not None: updates["groq_api_key"] = request.groq_api_key

    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": updates}
    )

    user = await db.users.find_one({"user_id": current_user["user_id"]})
    return sanitize_user(user)


@router.delete("/account")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete user account and all associated data."""
    db = get_db()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    uid = current_user["user_id"]
    await db.users.delete_one({"user_id": uid})
    # Optionally delete user's files/models too
    return {"message": "Account deleted successfully"}


# ── Google OAuth ───────────────────────────────────────────────────

from fastapi import Request
from fastapi.responses import RedirectResponse
import httpx, os

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL          = os.getenv("BACKEND_URL",  "http://localhost:8000")


@router.get("/google")
async def google_login():
    """Redirect to Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, "Google OAuth not configured. Add GOOGLE_CLIENT_ID to .env")

    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  f"{BACKEND_URL}/api/auth/google/callback",
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    from urllib.parse import urlencode
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback."""
    if error or not code:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_cancelled")

    db = get_db()

    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code":          code,
                    "client_id":     GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri":  f"{BACKEND_URL}/api/auth/google/callback",
                    "grant_type":    "authorization_code",
                },
            )
            tokens = token_resp.json()

            if "error" in tokens:
                return RedirectResponse(f"{FRONTEND_URL}/login?error=google_token_failed")

            # Get user info from Google
            user_resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            guser = user_resp.json()

    except Exception as e:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=google_failed")

    email  = guser.get("email", "").lower()
    name   = guser.get("name", "User")
    avatar = name[0].upper()
    pic    = guser.get("picture", "")

    if not email:
        return RedirectResponse(f"{FRONTEND_URL}/login?error=no_email")

    # Find or create user
    user = None
    if db is not None:
        user = await db.users.find_one({"email": email})

    if not user:
        user_id  = str(uuid.uuid4())
        now      = datetime.utcnow()
        user = {
            "user_id":     user_id,
            "name":        name,
            "email":       email,
            "password":    "",           # no password for Google users
            "institution": "",
            "role":        "student",
            "groq_api_key":"",
            "avatar":      avatar,
            "picture":     pic,
            "provider":    "google",
            "created_at":  now,
            "updated_at":  now,
        }
        if db is not None:
            await db.users.insert_one(user)
    else:
        # Update picture if changed
        if db is not None and pic:
            await db.users.update_one(
                {"email": email},
                {"$set": {"picture": pic, "updated_at": datetime.utcnow()}}
            )

    token = create_token(user["user_id"], email)

    # Redirect to frontend with token
    return RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={token}")
