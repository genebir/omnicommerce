"""인증 유스케이스 서비스."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import AuthenticationError
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.infra.db.models.user import User


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def register(self, *, email: str, password: str, name: str) -> User:
        existing = await self._session.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            raise AuthenticationError("이미 등록된 이메일입니다")

        user = User(
            email=email,
            hashed_password=hash_password(password),
            name=name,
        )
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def login(self, *, email: str, password: str) -> dict:
        result = await self._session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user or not verify_password(password, user.hashed_password):
            raise AuthenticationError("이메일 또는 비밀번호가 올바르지 않습니다")
        if not user.is_active:
            raise AuthenticationError("비활성화된 계정입니다")

        return {
            "access_token": create_access_token(user.id),
            "refresh_token": create_refresh_token(user.id),
            "token_type": "bearer",
            "user_id": str(user.id),
        }

    async def refresh(self, refresh_token: str) -> dict:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise AuthenticationError("유효하지 않은 리프레시 토큰입니다")

        user_id = uuid.UUID(payload["sub"])
        user = await self._session.get(User, user_id)
        if not user or not user.is_active:
            raise AuthenticationError("사용자를 찾을 수 없거나 비활성화된 계정입니다")

        return {
            "access_token": create_access_token(user.id),
            "refresh_token": create_refresh_token(user.id),
            "token_type": "bearer",
            "user_id": str(user.id),
        }

    async def change_password(self, *, user_id: uuid.UUID, current_password: str, new_password: str) -> None:
        user = await self._session.get(User, user_id)
        if not user:
            raise AuthenticationError("사용자를 찾을 수 없습니다")
        if not verify_password(current_password, user.hashed_password):
            raise AuthenticationError("현재 비밀번호가 올바르지 않습니다")
        user.hashed_password = hash_password(new_password)
        await self._session.commit()

    async def get_current_user(self, token: str) -> User:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise AuthenticationError("유효하지 않은 액세스 토큰입니다")

        user_id = uuid.UUID(payload["sub"])
        user = await self._session.get(User, user_id)
        if not user or not user.is_active:
            raise AuthenticationError("사용자를 찾을 수 없거나 비활성화된 계정입니다")
        return user
