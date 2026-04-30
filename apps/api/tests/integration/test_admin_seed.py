"""부트스트랩 관리자 시드 회귀 테스트.

페이즈 8에서 만든 `/admin/settings/*` 게이트를 통과할 admin 사용자를 안전하게 시드하는지 확인.
- 비어있는 패스워드 → skip (운영 안전: 명시적 설정 없으면 admin 만들지 않음)
- 동일 이메일에 admin이 이미 있으면 silent skip (멱등)
- 동일 이메일에 일반 사용자가 있으면 자동 승격 안 함 (보안 — 비밀번호 덮어쓰기 차단)
"""

import sys
import uuid
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# scripts/seed_admin.py를 import 하기 위해 apps/api 루트를 path에 추가
_API_DIR = Path(__file__).resolve().parents[2]
if str(_API_DIR) not in sys.path:
    sys.path.insert(0, str(_API_DIR))

from scripts.seed_admin import seed_bootstrap_admin  # noqa: E402
from src.core.security import verify_password  # noqa: E402
from src.core.settings import settings  # noqa: E402
from src.infra.db.models.user import User  # noqa: E402


@pytest_asyncio.fixture
async def session_factory():
    """test_engine 기반의 async_sessionmaker — seed_bootstrap_admin에 직접 주입."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False, poolclass=NullPool)
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        yield factory
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_skip_when_password_empty(session_factory):
    """BOOTSTRAP_ADMIN_PASSWORD가 비어있으면 admin을 만들지 않는다."""
    result = await seed_bootstrap_admin(
        email=f"empty-{uuid.uuid4().hex[:8]}@example.com",
        password="",
        session_factory=session_factory,
    )
    assert result == "skipped_no_password"


@pytest.mark.asyncio
async def test_creates_new_admin(session_factory):
    """신규 이메일이면 is_superuser=True 사용자를 생성한다."""
    email = f"newadmin-{uuid.uuid4().hex[:8]}@example.com"
    password = "admin-pass-1234"  # pragma: allowlist secret

    result = await seed_bootstrap_admin(email=email, password=password, session_factory=session_factory)
    assert result == "created"

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        assert user.is_superuser is True
        assert user.is_active is True
        assert user.name == "Admin"
        assert verify_password(password, user.hashed_password) is True


@pytest.mark.asyncio
async def test_idempotent_when_admin_exists(session_factory):
    """이미 admin이 있으면 두 번 호출해도 변경 없이 silent skip."""
    email = f"existing-admin-{uuid.uuid4().hex[:8]}@example.com"
    password = "admin-pass-1234"  # pragma: allowlist secret

    first = await seed_bootstrap_admin(email=email, password=password, session_factory=session_factory)
    assert first == "created"

    # 같은 이메일+패스워드로 한 번 더 — 변경 없이 skip
    second = await seed_bootstrap_admin(email=email, password="다른-비밀번호", session_factory=session_factory)
    assert second == "skipped_already_admin"

    # 비밀번호가 바뀌지 않았는지 확인 (멱등 + 보안)
    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        assert verify_password(password, user.hashed_password) is True


@pytest.mark.asyncio
async def test_does_not_promote_existing_user(client, session_factory):
    """동일 이메일에 일반 사용자가 있으면 자동 승격하지 않는다 (비밀번호 덮어쓰기 차단)."""
    email = f"seller-{uuid.uuid4().hex[:8]}@example.com"
    seller_password = "seller-original-pass"  # pragma: allowlist secret

    # 일반 셀러로 가입 (회원가입 API 경유)
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": seller_password, "name": "셀러"},
    )

    result = await seed_bootstrap_admin(
        email=email,
        password="admin-attempt-pass",  # pragma: allowlist secret
        session_factory=session_factory,
    )
    assert result == "skipped_existing_user"

    # 기존 사용자가 admin으로 변하지 않았는지, 비밀번호도 그대로인지 검증
    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        assert user.is_superuser is False
        assert verify_password(seller_password, user.hashed_password) is True
