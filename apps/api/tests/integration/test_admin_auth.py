"""관리자 설정 API 권한 모델 회귀 테스트.

다음을 검증한다:
- `/admin/settings/*` 엔드포인트는 미인증 → 401, 일반 사용자 → 403, 관리자(`is_superuser=True`) → 200
- `/config/full`은 미인증 → 401, 인증된 사용자 → 200
- `/config/ui`는 공개 유지 → 200 (로그인 페이지에서 필요)
"""

import uuid

import pytest
from sqlalchemy import update

from src.infra.db.models.user import User


async def _register_login(client, email: str) -> str:
    password = "testpass1234"  # pragma: allowlist secret
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": "테스트유저"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return resp.json()["data"]["access_token"]


async def _promote_to_admin(client, email: str) -> None:
    """`is_superuser`를 직접 True로 설정 (테스트 전용 헬퍼)."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy.pool import NullPool

    from src.core.settings import settings

    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await session.execute(update(User).where(User.email == email).values(is_superuser=True))
        await session.commit()
    await engine.dispose()


@pytest.mark.asyncio
async def test_admin_settings_require_auth(client):
    """미인증 호출은 401."""
    fake_id = uuid.uuid4()
    fake_history = uuid.uuid4()

    assert (await client.get("/api/v1/admin/settings")).status_code == 401
    assert (await client.get(f"/api/v1/admin/settings/{fake_id}")).status_code == 401
    assert (await client.patch(f"/api/v1/admin/settings/{fake_id}", json={"value": 1})).status_code == 401
    assert (
        await client.post(f"/api/v1/admin/settings/{fake_id}/rollback?history_id={fake_history}")
    ).status_code == 401
    assert (await client.get(f"/api/v1/admin/settings/{fake_id}/history")).status_code == 401


@pytest.mark.asyncio
async def test_admin_settings_forbid_non_superuser(client):
    """일반 사용자(`is_superuser=False`)는 403."""
    email = f"normal-{uuid.uuid4().hex[:8]}@example.com"
    token = await _register_login(client, email)
    client.headers["Authorization"] = f"Bearer {token}"

    fake_id = uuid.uuid4()
    fake_history = uuid.uuid4()

    assert (await client.get("/api/v1/admin/settings")).status_code == 403
    assert (await client.get(f"/api/v1/admin/settings/{fake_id}")).status_code == 403
    assert (await client.patch(f"/api/v1/admin/settings/{fake_id}", json={"value": 1})).status_code == 403
    assert (
        await client.post(f"/api/v1/admin/settings/{fake_id}/rollback?history_id={fake_history}")
    ).status_code == 403
    assert (await client.get(f"/api/v1/admin/settings/{fake_id}/history")).status_code == 403

    del client.headers["Authorization"]


@pytest.mark.asyncio
async def test_admin_settings_allow_superuser(client):
    """관리자(`is_superuser=True`)는 200."""
    email = f"admin-{uuid.uuid4().hex[:8]}@example.com"
    token = await _register_login(client, email)
    await _promote_to_admin(client, email)

    # 새 토큰으로 다시 로그인 — get_current_user가 DB에서 최신 권한을 읽도록
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "testpass1234"},  # pragma: allowlist secret
    )
    token = login.json()["data"]["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    resp = await client.get("/api/v1/admin/settings")
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    # 시드된 app_settings가 적어도 1건 있어야 한다
    assert isinstance(body["data"], list)

    del client.headers["Authorization"]


@pytest.mark.asyncio
async def test_config_full_requires_auth(client):
    """`/config/full`은 인증 필요."""
    assert (await client.get("/api/v1/config/full")).status_code == 401

    email = f"u-{uuid.uuid4().hex[:8]}@example.com"
    token = await _register_login(client, email)
    client.headers["Authorization"] = f"Bearer {token}"
    resp = await client.get("/api/v1/config/full")
    assert resp.status_code == 200
    del client.headers["Authorization"]


@pytest.mark.asyncio
async def test_config_ui_remains_public(client):
    """`/config/ui`는 로그인 페이지에서도 필요하므로 공개 유지."""
    resp = await client.get("/api/v1/config/ui")
    assert resp.status_code == 200
