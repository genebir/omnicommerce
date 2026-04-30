"""FastAPI 의존성 주입(DI) 공통 모듈."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.infra.db.models.user import User
from src.infra.db.session import get_session

SessionDep = Annotated[AsyncSession, Depends(get_session)]

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)] = None,
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증이 필요합니다")

    from src.core.exceptions import AuthenticationError
    from src.services.auth_service import AuthService

    service = AuthService(session)
    try:
        return await service.get_current_user(credentials.credentials)
    except AuthenticationError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e


CurrentUserDep = Annotated[User, Depends(get_current_user)]


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """관리자(`is_superuser=True`) 전용 엔드포인트 보호.

    Why: 일반 셀러 계정이 `app_settings`(레이트리밋·기능 플래그·이메일 템플릿
    등)을 조회/수정/롤백하면 다른 모든 셀러의 운영에 영향을 미친다.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다",
        )
    return current_user


AdminUserDep = Annotated[User, Depends(require_admin)]
