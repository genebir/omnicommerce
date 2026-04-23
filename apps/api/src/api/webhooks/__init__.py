"""웹훅 수신 라우터 (§6.1)."""

from fastapi import APIRouter

from src.api.webhooks.cafe24 import router as cafe24_router

router = APIRouter(prefix="/api/webhooks", tags=["웹훅"])
router.include_router(cafe24_router)
