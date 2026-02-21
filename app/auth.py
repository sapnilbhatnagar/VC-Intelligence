"""JWT authentication utilities and FastAPI dependencies."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app.config import settings

ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def _decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
        return {"id": payload["sub"], "email": payload["email"], "role": payload["role"]}
    except JWTError:
        return None


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[dict]:
    """Returns the current user dict or None if unauthenticated."""
    if not token:
        return None
    return _decode_token(token)


async def require_auth(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """Raises 401 if not authenticated."""
    user = _decode_token(token) if token else None
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


async def require_admin(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """Raises 401/403 if not an admin."""
    user = _decode_token(token) if token else None
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user
