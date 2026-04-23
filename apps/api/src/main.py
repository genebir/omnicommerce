"""OmniCommerce API 진입점."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from src.api.v1.router import router as v1_router
from src.api.webhooks import router as webhooks_router
from src.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ConflictError,
    NotFoundError,
    OmniCommerceError,
    ValidationError,
)
from src.core.logging import setup_logging
from src.core.middleware import RequestContextMiddleware
from src.core.settings import settings
from src.infra.cache.redis import close_pool
from src.infra.cache.settings_cache import settings_cache


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    await settings_cache.start_listener()
    yield
    await settings_cache.stop_listener()
    await close_pool()


app = FastAPI(
    title="OmniCommerce API",
    description="멀티 커머스 통합 관리 플랫폼",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.is_dev else None,
    redoc_url="/redoc" if settings.is_dev else None,
)

app.add_middleware(RequestContextMiddleware)
app.include_router(v1_router)
app.include_router(webhooks_router)


def _problem(
    *,
    status: int,
    title: str,
    detail: str,
    request: Request,
    error_type: str = "about:blank",
) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "type": error_type,
            "title": title,
            "status": status,
            "detail": detail,
            "instance": str(request.url),
        },
    )


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return _problem(status=404, title="리소스를 찾을 수 없습니다", detail=str(exc), request=request)


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return _problem(status=409, title="충돌", detail=str(exc), request=request)


@app.exception_handler(AuthenticationError)
async def auth_error_handler(request: Request, exc: AuthenticationError):
    return _problem(status=401, title="인증 실패", detail=str(exc), request=request)


@app.exception_handler(AuthorizationError)
async def authz_error_handler(request: Request, exc: AuthorizationError):
    return _problem(status=403, title="권한 없음", detail=str(exc), request=request)


@app.exception_handler(ValidationError)
async def validation_handler(request: Request, exc: ValidationError):
    return _problem(status=422, title="유효성 검사 실패", detail=str(exc), request=request)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    return _problem(status=422, title="요청 유효성 검사 실패", detail=str(exc), request=request)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return _problem(status=exc.status_code, title=exc.detail, detail=exc.detail, request=request)


@app.exception_handler(OmniCommerceError)
async def generic_handler(request: Request, exc: OmniCommerceError):
    return _problem(status=500, title="서버 오류", detail=str(exc), request=request)
