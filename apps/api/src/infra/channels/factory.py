"""채널 게이트웨이 팩토리 — 저장된 자격증명으로 인스턴스 생성."""

import json

from src.infra.channels import registry
from src.infra.db.models.channel import Channel
from src.utils.crypto import decrypt


def create_gateway(channel: Channel):
    """Channel 레코드에서 자격증명을 복호화해 게이트웨이 인스턴스를 반환한다."""
    credentials = json.loads(decrypt(channel.credentials_encrypted))
    cls = registry.get(channel.channel_type)
    return cls(**credentials)
