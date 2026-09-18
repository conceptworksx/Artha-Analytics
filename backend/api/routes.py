from fastapi import APIRouter

from api.routers.health import router as health_router
from api.routers.auth import router as auth_router
from api.routers.stocks import router as stocks_router
from api.routers.analysis import router as analysis_router
from api.routers.debate import router as debate_router
from api.routers.history import router as history_router
from api.utils import limiter

router = APIRouter()

# Register modular sub-routers
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(stocks_router)
router.include_router(analysis_router)
router.include_router(debate_router)
router.include_router(history_router)

__all__ = ["router", "limiter"]
