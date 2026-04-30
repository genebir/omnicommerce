"""관리자 설정 API — app_settings CRUD + 변경 이력 (CLAUDE.md §9.10)."""

import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from src.api.v1.schemas import ApiResponse, PaginatedResponse, PaginationMeta
from src.core.deps import AdminUserDep, SessionDep
from src.infra.cache.settings_cache import settings_cache
from src.infra.db.models.app_settings import AppSetting, AppSettingHistory
from src.utils.clock import now

router = APIRouter(prefix="/admin")


class SettingResponse(BaseModel):
    id: uuid.UUID
    key: str
    value: Any
    value_type: str
    scope: str
    description: str
    is_secret: bool
    default_value: Any
    version: int

    model_config = {"from_attributes": True}


class SettingHistoryResponse(BaseModel):
    id: uuid.UUID
    key: str
    old_value: Any
    new_value: Any
    changed_by: uuid.UUID | None
    changed_at: str

    model_config = {"from_attributes": True}


class SettingUpdateRequest(BaseModel):
    value: Any


@router.get("/settings", response_model=PaginatedResponse[SettingResponse])
async def list_settings(
    session: SessionDep,
    _: AdminUserDep,
    q: str | None = Query(None, description="키·설명 검색"),
    scope: str | None = Query(None, description="스코프 필터 (global, channel:...)"),
    limit: int = Query(50, ge=1, le=200),
    cursor: str | None = Query(None),
):
    """모든 설정 목록 조회."""
    from sqlalchemy import func

    base = select(AppSetting)
    if q:
        base = base.where(AppSetting.key.ilike(f"%{q}%") | AppSetting.description.ilike(f"%{q}%"))
    if scope:
        base = base.where(AppSetting.scope == scope)

    query = base.order_by(AppSetting.key).limit(limit + 1)
    if cursor:
        query = query.where(AppSetting.key > cursor)

    result = await session.execute(query)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = items[-1].key if has_more and items else None

    total = (await session.execute(select(func.count()).select_from(base.subquery()))).scalar_one()

    # is_secret 설정은 value를 마스킹
    for item in items:
        if item.is_secret:
            item.value = {"masked": True}

    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(next_cursor=next_cursor, has_more=has_more, total=total),
    )


@router.get("/settings/{setting_id}", response_model=ApiResponse[SettingResponse])
async def get_setting(setting_id: uuid.UUID, session: SessionDep, _: AdminUserDep):
    """설정 단건 조회."""
    setting = await session.get(AppSetting, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다")
    if setting.is_secret:
        setting.value = {"masked": True}
    return ApiResponse(data=setting)


@router.patch("/settings/{setting_id}", response_model=ApiResponse[SettingResponse])
async def update_setting(
    setting_id: uuid.UUID,
    body: SettingUpdateRequest,
    session: SessionDep,
    current_user: AdminUserDep,
):
    """설정값 수정 — 변경 이력 자동 기록."""
    setting = await session.get(AppSetting, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다")

    old_value = setting.value

    history = AppSettingHistory(
        setting_id=setting.id,
        key=setting.key,
        old_value=old_value,
        new_value=body.value,
        changed_by=current_user.id,
        changed_at=now(),
    )
    session.add(history)

    setting.value = body.value
    setting.version += 1
    setting.updated_by = current_user.id

    await session.commit()
    await session.refresh(setting)

    # 캐시 즉시 무효화 + 다른 인스턴스에 pub/sub 전파
    settings_cache.invalidate(setting.key)
    await settings_cache.publish_invalidation(setting.key)

    return ApiResponse(data=setting)


@router.post("/settings/{setting_id}/rollback", response_model=ApiResponse[SettingResponse])
async def rollback_setting(
    setting_id: uuid.UUID,
    history_id: uuid.UUID,
    session: SessionDep,
    current_user: AdminUserDep,
):
    """특정 이력으로 롤백 — 이력 항목의 old_value를 현재값으로 복원."""
    setting = await session.get(AppSetting, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다")

    history = await session.get(AppSettingHistory, history_id)
    if not history or history.setting_id != setting_id:
        raise HTTPException(status_code=404, detail="변경 이력을 찾을 수 없습니다")

    if history.old_value is None:
        raise HTTPException(status_code=400, detail="최초 생성 시점으로는 롤백할 수 없습니다")

    rollback_record = AppSettingHistory(
        setting_id=setting.id,
        key=setting.key,
        old_value=setting.value,
        new_value=history.old_value,
        changed_by=current_user.id,
        changed_at=now(),
    )
    session.add(rollback_record)

    setting.value = history.old_value
    setting.version += 1
    setting.updated_by = current_user.id

    await session.commit()
    await session.refresh(setting)
    settings_cache.invalidate(setting.key)
    await settings_cache.publish_invalidation(setting.key)

    return ApiResponse(data=setting)


@router.get(
    "/settings/{setting_id}/history",
    response_model=ApiResponse[list[SettingHistoryResponse]],
)
async def get_setting_history(
    setting_id: uuid.UUID,
    session: SessionDep,
    _: AdminUserDep,
    limit: int = Query(20, ge=1, le=100),
):
    """설정 변경 이력 조회 (최신순)."""
    setting = await session.get(AppSetting, setting_id)
    if not setting:
        raise HTTPException(status_code=404, detail="설정을 찾을 수 없습니다")

    result = await session.execute(
        select(AppSettingHistory)
        .where(AppSettingHistory.setting_id == setting_id)
        .order_by(AppSettingHistory.changed_at.desc())
        .limit(limit)
    )
    items = list(result.scalars().all())

    # 이력의 값도 마스킹
    if setting.is_secret:
        for item in items:
            item.old_value = {"masked": True}
            item.new_value = {"masked": True}

    # changed_at을 ISO 문자열로 변환
    history_list = [
        SettingHistoryResponse(
            id=h.id,
            key=h.key,
            old_value=h.old_value,
            new_value=h.new_value,
            changed_by=h.changed_by,
            changed_at=h.changed_at.isoformat(),
        )
        for h in items
    ]
    return ApiResponse(data=history_list)
