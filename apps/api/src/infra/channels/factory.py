"""채널 게이트웨이 팩토리 — 저장된 자격증명으로 인스턴스 생성."""

import json

from src.infra.channels import registry
from src.infra.db.models.channel import Channel
from src.utils.crypto import decrypt, encrypt


def create_gateway(channel: Channel, session=None):
    """Channel 레코드에서 자격증명을 복호화해 게이트웨이 인스턴스를 반환한다.

    session을 넘기면 토큰 갱신 성공 시 DB에 자동 저장한다.
    """
    credentials = json.loads(decrypt(channel.credentials_encrypted))
    cls = registry.get(channel.channel_type)
    gateway = cls(**credentials)

    if session is not None and hasattr(gateway, "set_token_refresh_callback"):
        _attach_token_refresh_callback(gateway, channel, session)

    return gateway


def _attach_token_refresh_callback(gateway, channel: Channel, session) -> None:
    """갱신된 토큰을 Channel 레코드에 저장하는 콜백을 게이트웨이에 연결한다."""

    async def on_token_refresh(access_token: str, refresh_token: str | None) -> None:
        creds = json.loads(decrypt(channel.credentials_encrypted))
        creds["access_token"] = access_token
        if refresh_token:
            creds["refresh_token"] = refresh_token
        channel.credentials_encrypted = encrypt(json.dumps(creds))
        await session.commit()

    gateway.set_token_refresh_callback(on_token_refresh)
