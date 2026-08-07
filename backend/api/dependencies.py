from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from repositories.user_repository import UserRepository
from repositories.analysis_repository import AnalysisRepository
from services.auth_service import AuthService
from services.analysis_service import AnalysisService
from core.exceptions import InvalidTokenError
from api.models import AuthUser

bearer_scheme = HTTPBearer(auto_error=False)


def get_user_repository() -> UserRepository:
    return UserRepository()


def get_analysis_repository() -> AnalysisRepository:
    return AnalysisRepository()


def get_auth_service(
    user_repository: UserRepository = Depends(get_user_repository),
) -> AuthService:
    return AuthService(user_repository)


def get_analysis_service(
    analysis_repository: AnalysisRepository = Depends(get_analysis_repository),
) -> AnalysisService:
    return AnalysisService(analysis_repository)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    user_repository: UserRepository = Depends(get_user_repository),
) -> AuthUser:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise InvalidTokenError("Sign in to continue.")

    token = credentials.credentials
    claims = auth_service.verify_token(token)

    user_row = await user_repository.get_by_id(claims["sub"])
    if not user_row:
        raise InvalidTokenError("Session expired or user not found.")

    return AuthUser(
        id=str(user_row["_id"]),
        email=user_row["email"],
        name=user_row.get("name"),
    )


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    auth_service: AuthService = Depends(get_auth_service),
    user_repository: UserRepository = Depends(get_user_repository),
) -> AuthUser | None:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None

    token = credentials.credentials
    try:
        claims = auth_service.verify_token(token)
        user_row = await user_repository.get_by_id(claims["sub"])
        if not user_row:
            return None

        return AuthUser(
            id=str(user_row["_id"]),
            email=user_row["email"],
            name=user_row.get("name"),
        )
    except Exception:
        return None
