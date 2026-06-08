"""Symmetric encryption for user-supplied secrets (their Claude API key).

Uses Fernet (AES-128-CBC + HMAC). The key is derived from JWT_SECRET_KEY, so no
extra secret/env is required. Rotating JWT_SECRET_KEY invalidates stored keys
(users would simply re-enter their API key), which is an acceptable trade-off.
"""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.jwt_secret_key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt_secret(plaintext: str) -> str:
    """Encrypt a secret for storage at rest."""
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(token: str | None) -> str | None:
    """Decrypt a stored secret; returns None if missing or undecryptable."""
    if not token:
        return None
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, ValueError):
        return None
