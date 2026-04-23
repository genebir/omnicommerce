"""헬스체크 엔드포인트 — /healthz, /readyz."""

from fastapi import APIRouter
from sqlalchemy import text

from src.core.deps import SessionDep

router = APIRouter()


@router.get("/healthz")
async def liveness():
    return {"status": "ok"}


@router.get("/readyz")
async def readiness(session: SessionDep):
    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    status = "ok" if db_ok else "degraded"
    return {
        "status": status,
        "checks": {
            "database": "ok" if db_ok else "fail",
        },
    }
