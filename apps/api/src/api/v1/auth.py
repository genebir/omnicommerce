"""인증 API 엔드포인트."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from src.api.v1.schemas import ApiResponse
from src.core.deps import CurrentUserDep, SessionDep
from src.core.exceptions import AuthenticationError
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["인증"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool

    model_config = {"from_attributes": True}


@router.post("/register", response_model=ApiResponse[UserResponse], status_code=201)
async def register(body: RegisterRequest, session: SessionDep):
    service = AuthService(session)
    try:
        user = await service.register(email=body.email, password=body.password, name=body.name)
        return ApiResponse(
            data=UserResponse(
                id=str(user.id),
                email=user.email,
                name=user.name,
                is_active=user.is_active,
            )
        )
    except AuthenticationError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(body: LoginRequest, session: SessionDep):
    service = AuthService(session)
    try:
        tokens = await service.login(email=body.email, password=body.password)
        return ApiResponse(data=tokens)
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


@router.get("/me", response_model=ApiResponse[UserResponse])
async def me(current_user: CurrentUserDep):
    return ApiResponse(
        data=UserResponse(
            id=str(current_user.id),
            email=current_user.email,
            name=current_user.name,
            is_active=current_user.is_active,
        )
    )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


@router.post("/change-password", response_model=ApiResponse[MessageResponse])
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    service = AuthService(session)
    try:
        await service.change_password(
            user_id=current_user.id,
            current_password=body.current_password,
            new_password=body.new_password,
        )
        return ApiResponse(data=MessageResponse(message="비밀번호가 변경되었습니다"))
    except AuthenticationError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh(body: RefreshRequest, session: SessionDep):
    service = AuthService(session)
    try:
        tokens = await service.refresh(body.refresh_token)
        return ApiResponse(data=tokens)
    except AuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e
