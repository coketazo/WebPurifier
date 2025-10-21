import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict

import jwt

from app.core.config import settings

PBKDF2_ALGORITHM = "sha256"
PBKDF2_ITERATIONS = 100_000
SALT_BYTES = 16


def _derive_key(password: str, salt: bytes) -> bytes:
    if not password:
        raise ValueError("Password must not be empty.")
    return hashlib.pbkdf2_hmac(
        PBKDF2_ALGORITHM,
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )


def hash_password(password: str) -> str:
    """
    Generate a salted PBKDF2 hash for the given password.
    Returns salt and hash encoded as hex, separated by a colon.
    """
    salt = secrets.token_bytes(SALT_BYTES)
    key = _derive_key(password, salt)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(password: str, stored_value: str) -> bool:
    """
    Validate a plaintext password against the stored salt/hash pair.
    """
    try:
        salt_hex, key_hex = stored_value.split(":")
    except ValueError:
        return False

    try:
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
    except ValueError:
        return False

    derived_key = _derive_key(password, salt)
    return hmac.compare_digest(derived_key, expected_key)


def create_access_token(claims: Dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """
    Generate a signed JWT including the provided claims.
    """
    payload = claims.copy()
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload.update({"iat": now, "exp": expire})
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT, returning the payload if valid.
    Raises ValueError when the token is invalid or expired.
    """
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise ValueError("Invalid authentication token.") from exc
