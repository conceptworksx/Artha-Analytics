from fastapi import APIRouter, Depends, Request, HTTPException

from api.models import (
    AuthRequest,
    AuthResponse,
    AuthUser,
    ChangePasswordRequest,
    GoogleAuthRequest,
    VerifyOpenRouterKeyRequest,
    RequestOTPRequest,
    VerifyOTPRequest,
    RequestOTPResponse,
)
from api.dependencies import (
    get_auth_service,
    get_analysis_service,
    get_cache_service,
    get_current_user,
)
from services.auth_service import AuthService
from services.analysis_service import AnalysisService
from services.cache_service import CacheService
from core.exceptions import DomainError
from api.utils import limiter, _ERROR_MAP

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/request-otp", response_model=RequestOTPResponse)
@limiter.limit("3/minute")
async def request_otp(
    request: Request,
    body: RequestOTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
    cache_service: CacheService = Depends(get_cache_service),
):
    email_clean = body.email.lower().strip()
    if cache_service.is_enabled:
        otp_key = f"ratelimit:otp:{email_clean}"
        otp_count = await cache_service.incr_counter(otp_key, ttl_seconds=600)
        if otp_count > 3:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "too_many_otp_requests",
                    "message": "Too many OTP requests for this email. Please wait 10 minutes before requesting again.",
                },
            )

    try:
        res = await auth_service.request_registration_otp(
            body.email, body.password, body.name
        )
        return RequestOTPResponse(status=res["status"], message=res["message"])
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (400, "otp_request_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/verify-otp", response_model=AuthResponse)
@limiter.limit("5/minute")
async def verify_otp(
    request: Request,
    body: VerifyOTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        token, user_doc = await auth_service.verify_otp_and_signup(
            body.email, body.otp_code
        )
        user = AuthUser(
            id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
        )
        return AuthResponse(token=token, user=user)
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (400, "otp_verification_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/signup", response_model=AuthResponse)
@limiter.limit("5/minute")
async def signup(
    request: Request,
    body: AuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    raise HTTPException(
        status_code=400,
        detail={
            "error": "otp_required",
            "message": "Email verification is required. Please request a verification code via /auth/request-otp first.",
        },
    )


@router.post("/login", response_model=AuthResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: AuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        token, user_doc = await auth_service.login_user(body.email, body.password)
        user = AuthUser(
            id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
        )
        return AuthResponse(token=token, user=user)
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (401, "login_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/google", response_model=AuthResponse)
@limiter.limit("5/minute")
async def google_auth(
    request: Request,
    body: GoogleAuthRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        token, user_doc = await auth_service.authenticate_google_user(
            body.credential_token
        )
        user = AuthUser(
            id=user_doc["id"], email=user_doc["email"], name=user_doc.get("name")
        )
        return AuthResponse(token=token, user=user)
    except DomainError as e:
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (400, "google_auth_failed"),
        )
        raise HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": e.message},
        )


@router.post("/logout")
async def logout():
    return {"status": "success", "message": "Logged out successfully."}


@router.get("/me", response_model=AuthUser)
def me(user: AuthUser = Depends(get_current_user)):
    return user


@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    body: ChangePasswordRequest,
    user: AuthUser = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    await auth_service.change_password(
        user.id, body.current_password, body.new_password
    )
    return {"status": "success", "message": "Password updated successfully."}


@router.post("/verify-openrouter-key")
def verify_openrouter_key(
    body: VerifyOpenRouterKeyRequest,
    analysis_service: AnalysisService = Depends(get_analysis_service),
):
    analysis_service.validate_api_keys(body.openrouter_api_key)
    return {"valid": True}
