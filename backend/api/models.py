from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class AuthRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    name: str | None = Field(default=None, max_length=100)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
            raise ValueError("Enter a valid email address.")
        return email

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(c.isupper() for c in value):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.islower() for c in value):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one number.")
        return value


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


class VerifyOpenRouterKeyRequest(BaseModel):
    openrouter_api_key: str


class AnalyzeRequest(BaseModel):
    ticker: str
    include_debate: bool = False
    thinking_mode: Literal["low", "medium", "high"] = "low"


class AnalyzeResponse(BaseModel):
    ticker: str
    news_report: dict | str | None = None
    technical_report: dict | str | None = None
    fundamental_report: dict | str | None = None
    market_report: dict | str | None = None
    sector_report: dict | str | None = None
    status: str
    company_info: dict | None = None
    historical_prices: list | None = None
    charts_data: Optional[dict] = None
    fundamental_data: dict | None = None
    technical_data: dict | None = None
    market_data: dict | None = None
    company_news: dict | None = None
    indian_news: dict | None = None
    global_news: dict | None = None
    verdict: dict | None = None
    bull_thesis: dict | str | None = None
    bear_thesis: dict | str | None = None


class AnalysisSummary(BaseModel):

    analysis_id: str
    ticker: str
    company_name: str | None = None
    analyzed_at: datetime
    status: str


class AnalysisDetail(AnalyzeResponse):

    analysis_id: str
    user_id: str
    analyzed_at: datetime
