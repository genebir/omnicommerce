"""웹훅 공통 스키마."""

from pydantic import BaseModel


class WebhookResponse(BaseModel):
    """웹훅 수신 응답 — 모든 채널 공통."""

    accepted: bool = True
