import os
from typing import Optional
from fastapi import Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

from core.error import (
    AgentError,
    AuthenticationError,
    LLMRateLimitError,
    TokenLimitError,
    ModelUnavailableError,
    MaxRetriesExceeded,
    NodeExecutionError,
    DataFetchError,
    ToolCallError,
)
from core.exceptions import (
    InvalidOTPError,
    OTPExpiredError,
    TooManyOTPAttemptsError,
    UserAlreadyExistsError,
    InvalidCredentialsError,
    EmailDeliveryError,
)
from core.logging import get_logger

logger = get_logger(__name__)


def get_client_ip(request: Request) -> str:
    """Extract client IP, prioritizing X-Forwarded-For and X-Real-IP if behind a proxy/load balancer."""
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


limiter = Limiter(key_func=get_client_ip)

_ERROR_MAP: dict[type, tuple[int, str]] = {
    AuthenticationError: (401, "invalid_api_key"),
    LLMRateLimitError: (429, "llm_rate_limit"),
    TokenLimitError: (422, "token_limit_exceeded"),
    ModelUnavailableError: (503, "llm_unavailable"),
    MaxRetriesExceeded: (503, "max_retries_exceeded"),
    DataFetchError: (422, "data_fetch_failed"),
    ToolCallError: (500, "tool_call_failed"),
    NodeExecutionError: (500, "node_execution_failed"),
    AgentError: (500, "analysis_failed"),
    InvalidOTPError: (400, "invalid_otp"),
    OTPExpiredError: (400, "otp_expired"),
    TooManyOTPAttemptsError: (429, "too_many_otp_attempts"),
    UserAlreadyExistsError: (409, "email_exists"),
    InvalidCredentialsError: (401, "invalid_credentials"),
    EmailDeliveryError: (503, "email_delivery_failed"),
}


def resolve_openrouter_key(
    request: Request,
    header_key: Optional[str] = None,
    alt_header_key: Optional[str] = None,
) -> Optional[str]:
    """
    Resolves OpenRouter API key across header variations and environment variables.
    """
    return (
        header_key
        or alt_header_key
        or request.headers.get("OpenRouter-API-Key")
        or request.headers.get("openrouter-api-key")
        or request.headers.get("X-Openrouter-Api-Key")
        or request.headers.get("x-openrouter-api-key")
        or os.getenv("OPEN_ROUTER_API_KEY")
        or os.getenv("OPENROUTER_API_KEY")
    )


def handle_pipeline_error(
    e: Exception, ticker: str, domain: str = "analysis"
) -> HTTPException:
    """
    Converts AgentError, rate-limit, auth, or unexpected errors during graph execution
    into standardized FastAPI HTTPExceptions with clean error codes and user messages.
    """
    if isinstance(e, AgentError):
        status_code, error_code = next(
            (v for k, v in _ERROR_MAP.items() if type(e) is k),
            (500, f"{domain}_failed"),
        )
        logger.error(
            f"{domain.capitalize()} failed | ticker={ticker} | "
            f"error={error_code} | {type(e).__name__}: {e}"
        )
        user_message = (
            f"Our AI {domain} engine encountered a temporary issue while compiling report data. Please try again in a moment."
            if status_code == 500
            else e.message
        )
        return HTTPException(
            status_code=status_code,
            detail={"error": error_code, "message": user_message},
        )

    logger.exception(
        f"Unexpected error occurred in /{domain} endpoint | ticker={ticker} | error={e}"
    )
    err_str = str(e).lower()
    if (
        "401" in err_str
        or "unauthorized" in err_str
        or "api_key" in err_str
        or "authentication" in err_str
    ):
        return HTTPException(
            status_code=401,
            detail={
                "error": "invalid_api_key",
                "message": "We couldn't authenticate with OpenRouter. Please verify your OpenRouter API Key.",
            },
        )
    elif (
        "429" in err_str
        or "rate limit" in err_str
        or "quota" in err_str
        or "too many" in err_str
    ):
        return HTTPException(
            status_code=429,
            detail={
                "error": "llm_rate_limit",
                "message": "All free AI models in the pool are currently rate-limited by OpenRouter. Please try again in a minute.",
            },
        )
    elif "503" in err_str or "unavailable" in err_str or "overloaded" in err_str:
        return HTTPException(
            status_code=503,
            detail={
                "error": "llm_unavailable",
                "message": "AI model servers are currently overloaded. Please retry in a few seconds.",
            },
        )
    else:
        return HTTPException(
            status_code=500,
            detail={
                "error": f"{domain}_failed",
                "message": (
                    f"Our AI {domain} engine encountered a temporary issue while compiling report data. Please try again in a moment."
                    if domain == "analysis"
                    else "Our AI debate engine encountered a temporary issue. Please try again in a moment."
                ),
            },
        )
