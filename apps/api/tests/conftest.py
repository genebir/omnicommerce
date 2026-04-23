"""테스트 공통 fixture."""

import uuid

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

import src.infra.db.models  # noqa: F401
from src.core.settings import settings
from src.infra.db.session import get_session
from src.main import app


@pytest_asyncio.fixture
async def client():
    test_engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def _override():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest_asyncio.fixture
async def auth_client(client):
    """JWT 인증 헤더가 포함된 클라이언트. 임시 유저를 생성해 로그인한다."""
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    password = "testpass1234"  # pragma: allowlist secret

    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": "테스트유저"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    token = login_resp.json()["data"]["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    yield client
    del client.headers["Authorization"]
