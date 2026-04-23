"""채널 도메인 엔티티 — 순수 Python, 프레임워크 독립."""

import uuid
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SyncStatus:
    SYNCED: str = "SYNCED"
    PENDING: str = "PENDING"
    FAILED: str = "FAILED"
    STALE: str = "STALE"


@dataclass(slots=True)
class ChannelConnection:
    id: uuid.UUID
    user_id: uuid.UUID
    channel_type: str
    shop_name: str
    is_active: bool = True

    def deactivate(self) -> None:
        self.is_active = False

    def activate(self) -> None:
        self.is_active = True
