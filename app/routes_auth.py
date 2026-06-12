"""Authentication routes: register, login, me, add-credits (mock payment)."""

import uuid
from fastapi import APIRouter, HTTPException, Depends

from app.auth import hash_password, verify_password, create_access_token, require_auth
from app.crypto import encrypt_secret, decrypt_secret
from pipeline.providers import PROVIDERS, is_admin_phrase, validate_key_format
from app.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse,
    UserResponse, AddCreditsRequest, ChangePasswordRequest, GoogleAuthRequest,
    SetApiKeyRequest,
)
from storage.database import (
    create_user, get_user_by_email, get_user_by_id, get_user_by_username,
    add_credits, list_analyses_by_user, update_user, update_last_login, log_credit_transaction,
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


def _api_key_meta(user: dict) -> tuple[bool, str | None, bool]:
    """(has_api_key, last4, uses_platform_key) without ever exposing the key."""
    dec = decrypt_secret(user.get("anthropic_api_key_enc"))
    if not dec:
        return (False, None, False)
    if is_admin_phrase(dec):
        return (True, None, True)
    return (True, dec[-4:], False)


def _validate_api_key_format(provider: str, key: str) -> None:
    """Reject obvious paste mistakes. The admin passphrase always passes."""
    if is_admin_phrase(key):
        return
    if not validate_key_format(provider, key):
        meta = PROVIDERS[provider]
        raise HTTPException(
            status_code=400,
            detail=f"That does not look like a {meta.label} API key ({meta.key_hint}).",
        )


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegisterRequest):
    if await get_user_by_email(req.email):
        raise HTTPException(status_code=409, detail="Email already registered.")
    if req.username and await get_user_by_username(req.username):
        raise HTTPException(status_code=409, detail="Username already taken.")
    # Validate the mandatory onboarding API key before creating anything.
    api_key = req.api_key.strip()
    _validate_api_key_format(req.llm_provider, api_key)
    uses_platform = is_admin_phrase(api_key)
    user_id = str(uuid.uuid4())
    await create_user(
        user_id, req.email, hash_password(req.password),
        role="user", credits=5, username=req.username, name=req.name,
    )
    await update_user(user_id, {
        "anthropic_api_key_enc": encrypt_secret(api_key),
        "llm_provider": req.llm_provider,
        "llm_effort": req.llm_effort,
    })
    await log_credit_transaction(user_id, 5, "signup_bonus", "Welcome credits on registration")
    # Registration signs the user in, so it counts as their first sign-in.
    await update_last_login(user_id)
    return TokenResponse(
        access_token=create_access_token(user_id, req.email, "user"),
        user_id=user_id, email=req.email, username=req.username,
        name=req.name, role="user", credits=5,
        has_api_key=True,
        api_key_last4=None if uses_platform else api_key[-4:],
        llm_provider=req.llm_provider, llm_effort=req.llm_effort,
        uses_platform_key=uses_platform,
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
    has_key, last4, uses_platform = _api_key_meta(user)
    return TokenResponse(
        access_token=token,
        user_id=user["id"], email=user["email"],
        username=user.get("username"), name=user.get("name"),
        role=user["role"], credits=user["credits"],
        has_api_key=has_key, api_key_last4=last4,
        llm_provider=user.get("llm_provider"), llm_effort=user.get("llm_effort"),
        uses_platform_key=uses_platform,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(require_auth)):
    user = await get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    has_key, last4, uses_platform = _api_key_meta(user)
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user.get("username"),
        name=user.get("name"),
        role=user["role"],
        credits=user["credits"],
        created_at=user["created_at"],
        has_api_key=has_key,
        api_key_last4=last4,
        llm_provider=user.get("llm_provider"),
        llm_effort=user.get("llm_effort"),
        uses_platform_key=uses_platform,
    )


@router.get("/me/analyses")
async def my_analyses(current_user: dict = Depends(require_auth)):
    return await list_analyses_by_user(current_user["id"])


@router.put("/me/api-key")
async def set_api_key(req: SetApiKeyRequest, current_user: dict = Depends(require_auth)):
    """Store the user's API key (encrypted), and optionally switch provider/effort."""
    user = await get_user_by_id(current_user["id"])
    provider = req.llm_provider or (user.get("llm_provider") if user else None) or "anthropic"
    key = req.api_key.strip()
    _validate_api_key_format(provider, key)
    updates: dict = {
        "anthropic_api_key_enc": encrypt_secret(key),
        "llm_provider": provider,
    }
    if req.llm_effort:
        updates["llm_effort"] = req.llm_effort
    await update_user(current_user["id"], updates)
    uses_platform = is_admin_phrase(key)
    return {
        "has_api_key": True,
        "api_key_last4": None if uses_platform else key[-4:],
        "llm_provider": provider,
        "llm_effort": req.llm_effort or (user.get("llm_effort") if user else None) or "medium",
        "uses_platform_key": uses_platform,
    }


@router.delete("/me/api-key")
async def clear_api_key(current_user: dict = Depends(require_auth)):
    """Remove the user's stored API key (revert to credit-based runs)."""
    await update_user(current_user["id"], {"anthropic_api_key_enc": None})
    return {"has_api_key": False, "api_key_last4": None, "uses_platform_key": False}


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
    has_key, last4, uses_platform = _api_key_meta(user)
    return TokenResponse(
        access_token=token,
        user_id=user["id"], email=user["email"],
        username=user.get("username"), name=user.get("name"),
        role=user["role"], credits=user["credits"],
        has_api_key=has_key, api_key_last4=last4,
        llm_provider=user.get("llm_provider"), llm_effort=user.get("llm_effort"),
        uses_platform_key=uses_platform,
    )
