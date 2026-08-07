from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from core.database import connect_to_mongo, close_mongo_connection
from api.routes import router, limiter
from core.logging import setup_logging, get_logger
from api.exceptions import register_exception_handlers
from services.analysis_service import AnalysisService
from repositories.analysis_repository import AnalysisRepository

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to MongoDB
    await connect_to_mongo()

    # Preload NSE ticker cache
    logger.info("Preloading NSE ticker cache...")
    repo = AnalysisRepository()
    service = AnalysisService(repo)
    service.pre_warm_cache()
    logger.info("NSE ticker cache ready")

    yield

    # Close connection
    await close_mongo_connection()


app = FastAPI(
    title="Indian Trading Agent API",
    description="Multi-agent stock analysis for Indian markets",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter

# Register global exception handlers
register_exception_handlers(app)


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


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "name": "Artha Analytics API",
        "status": "online",
        "description": "Multi-agent stock analysis for Indian markets",
        "docs_url": "/docs",
    }


app.include_router(router)

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=False)
