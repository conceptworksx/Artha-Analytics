from fastapi import APIRouter, HTTPException, Response
from core.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    try:
        db = get_db()
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        raise HTTPException(
            status_code=503, detail={"status": "unhealthy", "database": "disconnected"}
        )


@router.head("/health")
def health_check_head():
    return Response(status_code=200)
