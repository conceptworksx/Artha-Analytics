import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.parse
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

bearer_scheme = HTTPBearer(auto_error=False)


# ── MongoDB Client Setup ──────────────────────────────────────────────────────

def _escape_mongodb_uri(uri: str) -> str:
    match = re.match(r"^(mongodb(?:\+srv)?://)([^/]+)@([^/]+)(/.*)?$", uri)
    if not match:
        return uri
    scheme, credentials, host, path = match.groups()
    if ":" in credentials:
        username, password = credentials.split(":", 1)
        escaped_username = urllib.parse.quote_plus(username)
        escaped_password = urllib.parse.quote_plus(password)
        return f"{scheme}{escaped_username}:{escaped_password}@{host}{path or ''}"
    else:
        escaped_username = urllib.parse.quote_plus(credentials)
        return f"{scheme}{escaped_username}@{host}{path or ''}"


MONGODB_URI = os.getenv("MONGODB_URI")
if not MONGODB_URI:
    # Default fallback
    MONGODB_URI = "mongodb://localhost:27017/"

escaped_uri = _escape_mongodb_uri(MONGODB_URI)
client = MongoClient(escaped_uri)

# Retrieve default database or use "artha_analytics"
try:
    db = client.get_default_database()
    if db is None:
        db = client["artha_analytics"]
except Exception:
    db = client["artha_analytics"]

users_collection = db["users"]


TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 210_000


class AuthRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    name: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")
        return email


class AuthUser(BaseModel):
    id: str
    email: str
    name: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: AuthUser


def init_auth_store() -> None:
    try:
        users_collection.create_index("email", unique=True)
        # Check connection
        client.admin.command('ping')
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to initialize MongoDB connection: {e}")


def _secret_key() -> bytes:
    secret = os.getenv("AUTH_SECRET_KEY") or os.getenv("GROQ_API_KEY")
    if not secret:
        secret = "local-dev-auth-secret-change-me"
    return secret.encode("utf-8")


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return (
        f"pbkdf2_sha256${PBKDF2_ITERATIONS}$"
        f"{base64.urlsafe_b64encode(salt).decode()}$"
        f"{base64.urlsafe_b64encode(digest).decode()}"
    )


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored_hash.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_b64.encode())
        expected = base64.urlsafe_b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _b64_json(data: dict) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _decode_b64_json(data: str) -> dict:
    padded = data + "=" * (-len(data) % 4)
    raw = base64.urlsafe_b64decode(padded.encode("utf-8"))
    return json.loads(raw)


def _sign(payload: str) -> str:
    digest = hmac.new(_secret_key(), payload.encode("utf-8"), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("utf-8").rstrip("=")


def _create_token(user_id: str, email: str) -> str:
    payload = _b64_json(
        {
            "sub": user_id,
            "email": email,
            "exp": int(time.time()) + TOKEN_TTL_SECONDS,
        }
    )
    return f"{payload}.{_sign(payload)}"


def _get_user_by_email(email: str) -> dict | None:
    return users_collection.find_one({"email": email.lower()})


def _get_user_by_id(user_id: str) -> dict | None:
    try:
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


def signup_user(credentials: AuthRequest) -> AuthResponse:
    email = credentials.email.lower()
    # Check if user already exists
    if _get_user_by_email(email):
        raise HTTPException(
            status_code=409,
            detail={"error": "email_exists", "message": "An account already exists."},
        )

    try:
        name = credentials.name or ""
        user_doc = {
            "email": email,
            "name": name,
            "password_hash": _hash_password(credentials.password),
            "created_at": int(time.time()),
        }
        result = users_collection.insert_one(user_doc)
        user_id = str(result.inserted_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "database_error", "message": f"Failed to save user: {e}"},
        )

    user = AuthUser(id=user_id, email=email, name=name)
    return AuthResponse(token=_create_token(user.id, user.email), user=user)


def login_user(credentials: AuthRequest) -> AuthResponse:
    user_row = _get_user_by_email(credentials.email.lower())
    if not user_row or not _verify_password(
        credentials.password,
        user_row["password_hash"],
    ):
        raise HTTPException(
            status_code=401,
            detail={
                "error": "invalid_credentials",
                "message": "Email or password is incorrect.",
            },
        )

    user = AuthUser(
        id=str(user_row["_id"]),
        email=user_row["email"],
        name=user_row.get("name"),
    )
    return AuthResponse(token=_create_token(user.id, user.email), user=user)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={"error": "auth_required", "message": "Sign in to continue."},
        )

    token = credentials.credentials
    try:
        payload, signature = token.split(".", 1)
        if not hmac.compare_digest(signature, _sign(payload)):
            raise ValueError("bad signature")
        claims = _decode_b64_json(payload)
        if int(claims["exp"]) < int(time.time()):
            raise ValueError("expired")
        user_row = _get_user_by_id(claims["sub"])
        if not user_row:
            raise ValueError("missing user")
        return AuthUser(
            id=str(user_row["_id"]),
            email=user_row["email"],
            name=user_row.get("name"),
        )
    except Exception:
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_token", "message": "Session expired."},
        )
