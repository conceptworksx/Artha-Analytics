import base64
import hashlib
import hmac
import os
import secrets
import time
import asyncio
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from repositories.user_repository import UserRepository
from core.exceptions import (
    UserAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
    InvalidCurrentPasswordError,
    UnverifiedGoogleEmailError,
    ConfigurationError,
    InvalidTokenError,
)

PBKDF2_ITERATIONS = 210_000
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7


class AuthService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
        key = os.getenv("AUTH_SECRET_KEY")
        if not key:
            raise ConfigurationError("AUTH_SECRET_KEY environment variable is not set")
        self._cached_secret_key = key.encode("utf-8")

    def _secret_key(self) -> bytes:
        return self._cached_secret_key

    def _hash_password(self, password: str) -> str:
        salt = secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
        )
        return (
            f"pbkdf2_sha256${PBKDF2_ITERATIONS}$"
            f"{base64.urlsafe_b64encode(salt).decode()}$"
            f"{base64.urlsafe_b64encode(digest).decode()}"
        )

    def _verify_password(self, password: str, stored_hash: str) -> bool:
        try:
            algorithm, iterations, salt_b64, digest_b64 = stored_hash.split("$")
            if algorithm != "pbkdf2_sha256":
                return False
            salt = base64.urlsafe_b64decode(salt_b64.encode())
            expected = base64.urlsafe_b64decode(digest_b64.encode())
            actual = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), salt, int(iterations)
            )
            return hmac.compare_digest(actual, expected)
        except Exception:
            return False

    def create_token(self, user_id: str, email: str) -> str:
        payload = {
            "sub": user_id,
            "email": email,
            "exp": int(time.time()) + TOKEN_TTL_SECONDS,
        }
        return jwt.encode(payload, self._secret_key(), algorithm="HS256")

    def verify_token(self, token: str) -> dict:
        try:
            return jwt.decode(token, self._secret_key(), algorithms=["HS256"])
        except Exception:
            raise InvalidTokenError("Session expired or invalid token.")

    async def signup_user(
        self, email: str, password: str, name: str | None = None
    ) -> tuple[str, dict]:
        email = email.lower()
        existing_user = await self.user_repository.get_by_email(email)
        if existing_user:
            raise UserAlreadyExistsError("An account already exists.")

        password_hash = await asyncio.to_thread(self._hash_password, password)
        user_doc = {
            "email": email,
            "name": name or "",
            "password_hash": password_hash,
            "created_at": int(time.time()),
        }
        user_id = await self.user_repository.create_user(user_doc)
        user_doc["id"] = user_id
        return self.create_token(user_id, email), user_doc

    async def login_user(self, email: str, password: str) -> tuple[str, dict]:
        user_row = await self.user_repository.get_by_email(email)
        if not user_row or not user_row.get("password_hash"):
            raise InvalidCredentialsError("Email or password is incorrect.")

        is_valid = await asyncio.to_thread(
            self._verify_password, password, user_row["password_hash"]
        )
        if not is_valid:
            raise InvalidCredentialsError("Email or password is incorrect.")

        user_row["id"] = str(user_row["_id"])
        return self.create_token(user_row["id"], user_row["email"]), user_row

    async def change_password(
        self, user_id: str, current_password: str, new_password: str
    ) -> None:
        user_row = await self.user_repository.get_by_id(user_id)
        if not user_row:
            raise UserNotFoundError("User not found.")

        is_valid = await asyncio.to_thread(
            self._verify_password, current_password, user_row["password_hash"]
        )
        if not is_valid:
            raise InvalidCurrentPasswordError("Current password is incorrect.")

        new_hash = await asyncio.to_thread(self._hash_password, new_password)
        await self.user_repository.update_user(user_id, {"password_hash": new_hash})

    async def authenticate_google_user(self, credential_token: str) -> tuple[str, dict]:
        google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        if not google_client_id:
            raise ConfigurationError("Google Client ID is not configured on backend.")

        try:
            id_info = id_token.verify_oauth2_token(
                credential_token, google_requests.Request(), google_client_id
            )
            if not id_info.get("email_verified"):
                raise UnverifiedGoogleEmailError("Google email is not verified.")

            email = id_info["email"].lower()
            name = id_info.get("name", "")
            google_id = id_info["sub"]
        except Exception as e:
            raise InvalidCredentialsError(f"Token verification failed: {e}")

        user_doc = await self.user_repository.get_by_email(email)
        if not user_doc:
            new_user = {
                "email": email,
                "name": name,
                "google_id": google_id,
                "password_hash": "",
                "created_at": int(time.time()),
            }
            user_id = await self.user_repository.create_user(new_user)
            new_user["id"] = user_id
            user_doc = new_user
        else:
            user_id = str(user_doc["_id"])
            user_doc["id"] = user_id
            update_fields = {}
            if "google_id" not in user_doc:
                update_fields["google_id"] = google_id
            if not user_doc.get("name") and name:
                update_fields["name"] = name

            if update_fields:
                await self.user_repository.update_user(user_id, update_fields)
                user_doc.update(update_fields)

        return self.create_token(user_id, email), user_doc
