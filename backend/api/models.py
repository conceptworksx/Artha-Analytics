from typing import Optional
from pydantic import BaseModel, Field, field_validator

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


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class GoogleAuthRequest(BaseModel):
    credential_token: str


class VerifyGroqKeyRequest(BaseModel):
    groq_api_key: str


class AnalyzeRequest(BaseModel):
    ticker: str


class AnalyzeResponse(BaseModel):
    ticker: str
    news_report: str
    technical_report: str
    fundamental_report: str
    market_report: str
    sector_report: str
    status: str
    company_info: dict | None = None
    historical_prices: list | None = None
    charts_data: Optional[dict] = None
