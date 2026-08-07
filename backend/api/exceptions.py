from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from core.exceptions import (
    UserAlreadyExistsError,
    InvalidCredentialsError,
    UserNotFoundError,
    InvalidCurrentPasswordError,
    UnverifiedGoogleEmailError,
    InvalidTokenError,
    InvalidTickerFormatError,
    TickerNotFoundError,
    SearchLimitReachedError,
    DatabaseOperationError,
    ConfigurationError,
    InvalidAPIKeyError,
)
from core.logging import get_logger

logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI):

    @app.exception_handler(UserAlreadyExistsError)
    async def user_exists_handler(request: Request, exc: UserAlreadyExistsError):
        return JSONResponse(
            status_code=409,
            content={"detail": {"error": "email_exists", "message": exc.message}},
        )

    @app.exception_handler(InvalidCredentialsError)
    async def invalid_credentials_handler(
        request: Request, exc: InvalidCredentialsError
    ):
        return JSONResponse(
            status_code=401,
            content={
                "detail": {"error": "invalid_credentials", "message": exc.message}
            },
        )

    @app.exception_handler(UserNotFoundError)
    async def user_not_found_handler(request: Request, exc: UserNotFoundError):
        return JSONResponse(
            status_code=404,
            content={"detail": {"error": "user_not_found", "message": exc.message}},
        )

    @app.exception_handler(InvalidCurrentPasswordError)
    async def invalid_current_password_handler(
        request: Request, exc: InvalidCurrentPasswordError
    ):
        return JSONResponse(
            status_code=400,
            content={
                "detail": {"error": "invalid_current_password", "message": exc.message}
            },
        )

    @app.exception_handler(UnverifiedGoogleEmailError)
    async def unverified_google_email_handler(
        request: Request, exc: UnverifiedGoogleEmailError
    ):
        return JSONResponse(
            status_code=400,
            content={"detail": {"error": "unverified_email", "message": exc.message}},
        )

    @app.exception_handler(InvalidTokenError)
    async def invalid_token_handler(request: Request, exc: InvalidTokenError):
        return JSONResponse(
            status_code=401,
            content={"detail": {"error": "invalid_token", "message": exc.message}},
        )

    @app.exception_handler(InvalidTickerFormatError)
    async def invalid_ticker_format_handler(
        request: Request, exc: InvalidTickerFormatError
    ):
        return JSONResponse(
            status_code=422,
            content={
                "detail": {"error": "invalid_ticker_format", "message": exc.message}
            },
        )

    @app.exception_handler(TickerNotFoundError)
    async def ticker_not_found_handler(request: Request, exc: TickerNotFoundError):
        return JSONResponse(
            status_code=404,
            content={"detail": {"error": "ticker_not_found", "message": exc.message}},
        )

    @app.exception_handler(SearchLimitReachedError)
    async def search_limit_reached_handler(
        request: Request, exc: SearchLimitReachedError
    ):
        return JSONResponse(
            status_code=403,
            content={"detail": {"error": "limit_reached", "message": exc.message}},
        )

    @app.exception_handler(DatabaseOperationError)
    async def database_error_handler(request: Request, exc: DatabaseOperationError):
        logger.error(f"DatabaseOperationError: {exc.message}")
        return JSONResponse(
            status_code=500,
            content={"detail": {"error": "database_error", "message": exc.message}},
        )

    @app.exception_handler(ConfigurationError)
    async def configuration_error_handler(request: Request, exc: ConfigurationError):
        logger.error(f"ConfigurationError: {exc.message}")
        return JSONResponse(
            status_code=500,
            content={"detail": {"error": "config_error", "message": exc.message}},
        )

    @app.exception_handler(InvalidAPIKeyError)
    async def invalid_api_key_handler(request: Request, exc: InvalidAPIKeyError):
        return JSONResponse(
            status_code=401,
            content={"detail": {"error": "invalid_api_key", "message": exc.message}},
        )
