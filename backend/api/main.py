from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from api.controllers import init_auth_store, _refresh_cache_if_stale
from api.routes import router, limiter
from core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload NSE ticker cache at startup."""
    init_auth_store()
    logger.info("Preloading NSE ticker cache...")
    _refresh_cache_if_stale()
    logger.info("NSE ticker cache ready")
    yield


app = FastAPI(
    title="Indian Trading Agent API",
    description="Multi-agent stock analysis for Indian markets",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": {
                "error": "app_rate_limit",
                "message": "Too many requests to this API",
            }
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=False)
