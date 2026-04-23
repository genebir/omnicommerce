"""요청 컨텍스트 미들웨어 — request_id 자동 바인딩 (§11)."""

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from src.utils.id import new_id

logger = structlog.stdlib.get_logger()


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("x-request-id", str(new_id()))

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        await logger.ainfo("요청 수신")

        response = await call_next(request)
        response.headers["x-request-id"] = request_id

        await logger.ainfo("응답 완료", status_code=response.status_code)

        return response
