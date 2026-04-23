"""테스트 공통 fixture."""

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
