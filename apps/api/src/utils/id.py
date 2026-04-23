"""ID 생성 유틸 — UUIDv7 기반, 테스트에서 모킹 가능."""

import uuid


def new_id() -> uuid.UUID:
    return uuid.uuid7()
