import base64
import hashlib
import hmac
import os
import re
import secrets
import time
import urllib.parse
import threading
import requests
import pandas as pd
from io import StringIO
from typing import Optional
from langchain_groq import ChatGroq
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import HTTPException
from api.models import AuthRequest, AuthUser, AuthResponse, ChangePasswordRequest, GoogleAuthRequest
from core.logging import get_logger

logger = get_logger(__name__)
load_dotenv()

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
    MONGODB_URI = "mongodb://localhost:27017/"

escaped_uri = _escape_mongodb_uri(MONGODB_URI)
client = MongoClient(escaped_uri)

try:
    db = client.get_default_database()
    if db is None:
        db = client["artha_analytics"]
except Exception:
    db = client["artha_analytics"]

users_collection = db["users"]

TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 210_000


def init_auth_store() -> None:
    try:
        users_collection.create_index("email", unique=True)
        client.admin.command('ping')
    except Exception as e:
        logger.error(f"Failed to initialize MongoDB connection: {e}")


def _secret_key() -> bytes:
    secret = os.getenv("AUTH_SECRET_KEY")
    if not secret:
        secret = "$ECR@T"
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


def _create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    import jwt
    return jwt.encode(payload, _secret_key(), algorithm="HS256")


def _get_user_by_email(email: str) -> dict | None:
    return users_collection.find_one({"email": email.lower()})


def _get_user_by_id(user_id: str) -> dict | None:
    try:
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


def signup_user(credentials: AuthRequest) -> AuthResponse:
    email = credentials.email.lower()
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
    if not user_row or not user_row.get("password_hash") or not _verify_password(
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


def change_password_user(current_user: AuthUser, data: ChangePasswordRequest) -> None:
    user_row = _get_user_by_id(current_user.id)
    if not user_row:
        raise HTTPException(
            status_code=404,
            detail={"error": "user_not_found", "message": "User not found."},
        )

    if not _verify_password(data.current_password, user_row["password_hash"]):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_current_password",
                "message": "Current password is incorrect.",
            },
        )

    try:
        users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"password_hash": _hash_password(data.new_password)}},
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"error": "database_error", "message": f"Failed to update password: {e}"},
        )


def authenticate_google_user(body: GoogleAuthRequest) -> AuthResponse:
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not google_client_id:
        raise HTTPException(
            status_code=500,
            detail={"error": "config_error", "message": "Google Client ID is not configured on backend."},
        )

    try:
        id_info = id_token.verify_oauth2_token(
            body.credential_token,
            google_requests.Request(),
            google_client_id,
        )

        if not id_info.get("email_verified"):
            raise HTTPException(
                status_code=400,
                detail={"error": "unverified_email", "message": "Google email is not verified."},
            )

        email = id_info["email"].lower()
        name = id_info.get("name", "")
        google_id = id_info["sub"]
    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail={"error": "invalid_google_token", "message": f"Token verification failed: {e}"},
        )

    user_doc = _get_user_by_email(email)

    if not user_doc:
        try:
            new_user = {
                "email": email,
                "name": name,
                "google_id": google_id,
                "password_hash": "",
                "created_at": int(time.time()),
            }
            result = users_collection.insert_one(new_user)
            user_id = str(result.inserted_id)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail={"error": "database_error", "message": f"Failed to register Google user: {e}"},
            )
    else:
        user_id = str(user_doc["_id"])
        update_fields = {}
        if "google_id" not in user_doc:
            update_fields["google_id"] = google_id
        if not user_doc.get("name") and name:
            update_fields["name"] = name

        if update_fields:
            try:
                users_collection.update_one(
                    {"_id": user_doc["_id"]},
                    {"$set": update_fields},
                )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail={"error": "database_error", "message": f"Failed to link Google account: {e}"},
                )

    user = AuthUser(
        id=user_id,
        email=email,
        name=user_doc.get("name") if user_doc else name,
    )
    return AuthResponse(token=_create_token(user.id, user.email), user=user)


# ── Ticker & Key Validation (Validators) ──────────────────────────────────────

_cache: dict = {
    "nse_symbols": set(),
    "loaded_at": 0,
}

_cache_lock = threading.Lock()
_CACHE_TTL_SEC = 86_400
NSE_LIST_URL = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"


def _load_nse_symbols() -> set[str]:
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(NSE_LIST_URL, headers=headers, timeout=15)
        resp.raise_for_status()
        df = pd.read_csv(StringIO(resp.text))
        symbols = set(df["SYMBOL"].astype(str).str.strip().str.upper())
        logger.info(f"NSE symbols loaded: {len(symbols)}")
        return symbols
    except Exception as exc:
        logger.exception(f"NSE symbol fetch failed: {exc}")
        return set()


def _refresh_cache_if_stale() -> None:
    with _cache_lock:
        age = time.time() - _cache["loaded_at"]
        if age < _CACHE_TTL_SEC and _cache["nse_symbols"]:
            return
        logger.info("Refreshing ticker symbol cache...")
        _cache["nse_symbols"] = _load_nse_symbols()
        _cache["loaded_at"] = time.time()
        logger.info(f"Ticker cache refreshed | NSE={len(_cache['nse_symbols'])}")


_FORMAT_RE = re.compile(r"^[A-Z0-9&\-]{1,20}\.NS$", re.IGNORECASE)


def validate_ticker_format(ticker: str) -> tuple[bool, str | None]:
    if not ticker or not ticker.strip():
        return False, "Ticker cannot be empty."

    ticker = ticker.strip().upper()
    if not _FORMAT_RE.match(ticker):
        logger.warning(f"Ticker format validation failed | ticker={ticker}")
        return (
            False,
            f"'{ticker}' is not a valid ticker format. Use NSE ticker format like 'RELIANCE.NS'.",
        )
    return True, None


def validate_ticker_exists(ticker: str) -> tuple[bool, str | None]:
    _refresh_cache_if_stale()
    ticker = ticker.strip().upper()
    symbol, exchange = ticker.rsplit(".", 1)

    if exchange == "NS":
        if not _cache["nse_symbols"]:
            logger.warning("NSE cache unavailable")
            return False, "Ticker validation service temporarily unavailable."

        if symbol not in _cache["nse_symbols"]:
            logger.warning(f"NSE Ticker not found | ticker={ticker}")
            return (
                False,
                f"'{symbol}' was not found on NSE. Please verify the ticker symbol.",
            )

    return True, None


def validate_api_keys(groq_api_key: str) -> tuple[bool, str]:
    if not groq_api_key or not groq_api_key.strip():
        return False, "Groq API key is required."
    try:
        llm = ChatGroq(
            api_key=groq_api_key,
            model="llama-3.1-8b-instant",
            temperature=0,
        )
        llm.invoke("ping")
        return True, None
    except Exception:
        return False, "Invalid Groq API key"
