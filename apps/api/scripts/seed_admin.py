"""부트스트랩 관리자 시드 스크립트.

`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` 환경변수로 첫 관리자(`is_superuser=True`)를
생성한다. 페이즈 8에서 만든 `/admin/settings/*` 게이트는 admin 권한자가 한 명도 없으면
누구도 통과 못 하므로, 신규 셋업 머신에서 운영자가 한 번에 관리자 계정을 만들 수 있게 한다.

멱등 동작:
- `BOOTSTRAP_ADMIN_PASSWORD`가 비어있으면 skip (기본값)
- 동일 이메일 사용자가 이미 admin이면 skip
- 동일 이메일 사용자가 일반 셀러로 존재하면 절대 비밀번호를 덮어쓰지 않고 경고만 출력 후 skip

사용법:
    cd apps/api
    uv run python scripts/seed_admin.py
"""

import asyncio
import sys
from pathlib import Path

# scripts/ 디렉터리에서 실행 시 src 모듈을 찾을 수 있도록 path 보정
_API_DIR = Path(__file__).resolve().parent.parent
if str(_API_DIR) not in sys.path:
    sys.path.insert(0, str(_API_DIR))

from sqlalchemy import select  # noqa: E402

from src.core.security import hash_password  # noqa: E402
from src.core.settings import settings  # noqa: E402
from src.infra.db.models.user import User  # noqa: E402
from src.infra.db.session import async_session_factory  # noqa: E402


async def seed_bootstrap_admin(
    *,
    email: str | None = None,
    password: str | None = None,
    session_factory=None,
) -> str:
    """관리자를 멱등 시드한다.

    인자 미지정 시 `settings.BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD`를 사용한다.
    `session_factory`는 테스트에서 격리된 세션을 주입할 때 사용.

    Returns:
        "skipped_no_password": password가 비어있어 시드를 건너뛴 경우
        "skipped_already_admin": 이미 admin 권한 사용자가 동일 이메일로 존재
        "skipped_existing_user": 동일 이메일에 일반 사용자가 있어 안전을 위해 skip
        "created": 신규 생성 성공
    """
    target_email = email if email is not None else settings.BOOTSTRAP_ADMIN_EMAIL
    target_password = password if password is not None else settings.BOOTSTRAP_ADMIN_PASSWORD
    factory = session_factory or async_session_factory

    if not target_password:
        return "skipped_no_password"

    async with factory() as session:
        existing = (await session.execute(select(User).where(User.email == target_email))).scalar_one_or_none()

        if existing is not None:
            if existing.is_superuser:
                return "skipped_already_admin"
            # 일반 사용자가 동일 이메일을 점유 중. 안전을 위해 비밀번호 덮어쓰지 않음.
            # 운영자가 명시적으로 변경하려면 직접 DB를 수정해야 한다.
            return "skipped_existing_user"

        session.add(
            User(
                email=target_email,
                hashed_password=hash_password(target_password),
                name="Admin",
                is_active=True,
                is_superuser=True,
            )
        )
        await session.commit()
        return "created"


def main() -> int:
    result = asyncio.run(seed_bootstrap_admin())
    if result == "skipped_no_password":
        print("  ✓ BOOTSTRAP_ADMIN_PASSWORD가 비어있어 관리자 시드를 건너뜁니다.")
    elif result == "skipped_already_admin":
        print(f"  ✓ 관리자 '{settings.BOOTSTRAP_ADMIN_EMAIL}' 이미 존재")
    elif result == "skipped_existing_user":
        print(
            f"  ⚠ 이메일 '{settings.BOOTSTRAP_ADMIN_EMAIL}'에 일반 사용자가 존재 — "
            "안전을 위해 자동 승격 안 함. 직접 DB에서 is_superuser=True로 수정하세요."
        )
    elif result == "created":
        print(f"  ✓ 관리자 시드 완료: {settings.BOOTSTRAP_ADMIN_EMAIL}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
