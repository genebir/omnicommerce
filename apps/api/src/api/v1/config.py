"""설정 API 엔드포인트 — 캐시 경유 (§9.6)."""

from fastapi import APIRouter

from src.api.v1.schemas import ApiResponse
from src.config.schema import AppConfig
from src.core.deps import SessionDep
from src.infra.cache.settings_cache import settings_cache

router = APIRouter(prefix="/config")


@router.get("/ui")
async def get_ui_config(session: SessionDep) -> ApiResponse[dict]:
    config = await settings_cache.get(session)
    return ApiResponse(
        data={
            "ui": config.ui.model_dump(),
            "features": config.features.model_dump(),
        }
    )


@router.get("/full")
async def get_full_config(session: SessionDep) -> ApiResponse[AppConfig]:
    config = await settings_cache.get(session)
    return ApiResponse(data=config)
