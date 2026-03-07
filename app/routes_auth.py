"""Authentication routes: register, login, me, add-credits (mock payment)."""

import uuid
from fastapi import APIRouter, HTTPException, Depends

from app.auth import hash_password, verify_password, create_access_token, require_auth
from app.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    UserResponse, AddCreditsRequest, ChangePasswordRequest, GoogleAuthRequest,
)
from storage.database import (
    create_user, get_user_by_email, get_user_by_id, get_user_by_username,
    add_credits, list_analyses_by_user, update_user, update_last_login, log_credit_transaction,
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegisterRequest):
    if await get_user_by_email(req.email):
        raise HTTPException(status_code=409, detail="Email already registered.")
    if req.username and await get_user_by_username(req.username):
        raise HTTPException(status_code=409, detail="Username already taken.")
    user_id = str(uuid.uuid4())
    await create_user(
        user_id, req.email, hash_password(req.password),
        role="user", credits=5, username=req.username, name=req.name,
    )
    await log_credit_transaction(user_id, 5, "signup_bonus", "Welcome credits on registration")
    return TokenResponse(
        access_token=create_access_token(user_id, req.email, "user"),
        user_id=user_id, email=req.email, username=req.username,
        name=req.name, role="user", credits=5,
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest):
    # Try email first, then username
    user = await get_user_by_email(req.identifier)
    if not user:
        user = await get_user_by_username(req.identifier)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    token = create_access_token(user["id"], user["email"], user["role"])
    await update_last_login(user["id"])
    return TokenResponse(
        access_token=token,
        user_id=user["id"], email=user["email"],
        username=user.get("username"), name=user.get("name"),
        role=user["role"], credits=user["credits"],
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(require_auth)):
    user = await get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user.get("username"),
        name=user.get("name"),
        role=user["role"],
        credits=user["credits"],
        created_at=user["created_at"],
    )


@router.get("/me/analyses")
async def my_analyses(current_user: dict = Depends(require_auth)):
    return await list_analyses_by_user(current_user["id"])


@router.post("/me/add-credits")
async def purchase_credits(req: AddCreditsRequest, current_user: dict = Depends(require_auth)):
    """Mock payment endpoint — adds credits without real payment processing."""
    await add_credits(current_user["id"], req.amount)
    await log_credit_transaction(current_user["id"], req.amount, "purchase", f"User purchased {req.amount} credits")
    user = await get_user_by_id(current_user["id"])
    return {"message": f"Added {req.amount} credits.", "new_balance": user["credits"]}


@router.patch("/me/profile")
async def update_profile(
    updates: dict,
    current_user: dict = Depends(require_auth),
):
    """Update display name and/or username for the current user."""
    allowed = {}
    if "name" in updates:
        allowed["name"] = updates["name"]
    if "username" in updates and updates["username"]:
        # Check uniqueness
        existing = await get_user_by_username(updates["username"])
        if existing and existing["id"] != current_user["id"]:
            raise HTTPException(status_code=409, detail="Username already taken.")
        allowed["username"] = updates["username"]
    if allowed:
        await update_user(current_user["id"], allowed)
    user = await get_user_by_id(current_user["id"])
    return UserResponse(
        id=user["id"], email=user["email"],
        username=user.get("username"), name=user.get("name"),
        role=user["role"], credits=user["credits"], created_at=user["created_at"],
    )


@router.put("/me/password")
async def change_password(req: ChangePasswordRequest, current_user: dict = Depends(require_auth)):
    user = await get_user_by_id(current_user["id"])
    if not user or not verify_password(req.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    await update_user(current_user["id"], {"password_hash": hash_password(req.new_password)})
    return {"message": "Password updated successfully."}


@router.post("/google", response_model=TokenResponse)
async def google_auth(req: GoogleAuthRequest):
    """Verify a Google ID token and sign the user in (or create account)."""
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google authentication is not configured on this server.")
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        idinfo = google_id_token.verify_oauth2_token(
            req.credential,
            google_requests.Request(),
            settings.google_client_id,
        )
        email = idinfo["email"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google credential.")

    user = await get_user_by_email(email)
    if not user:
        uid = str(uuid.uuid4())
        # Google-authenticated users get a random unusable password hash
        await create_user(uid, email, hash_password(str(uuid.uuid4())), role="user", credits=5)
        user = await get_user_by_id(uid)

    token = create_access_token(user["id"], user["email"], user["role"])
    await update_last_login(user["id"])
    return TokenResponse(
        access_token=token,
        user_id=user["id"], email=user["email"],
        username=user.get("username"), name=user.get("name"),
        role=user["role"], credits=user["credits"],
    )
