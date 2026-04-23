"""DB에서 app_settings를 읽어 AppConfig로 조립하는 로더."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.schema import AppConfig
from src.infra.db.models.app_settings import AppSetting


async def load_app_config(session: AsyncSession, scope: str = "global") -> AppConfig:
    result = await session.execute(select(AppSetting).where(AppSetting.scope == scope))
    settings = result.scalars().all()

    config_dict: dict = {}
    for s in settings:
        _set_nested(config_dict, s.key, s.value)

    return AppConfig.model_validate(config_dict)


def _set_nested(d: dict, dotted_key: str, value: dict) -> None:
    """점-경로 키(예: 'channel.cafe24.rate_limit')를 중첩 dict에 설정."""
    parts = dotted_key.split(".")
    if parts[0] == "channel" and len(parts) >= 2:
        parts = parts[1:]

    if parts[-1] == "polling_interval_sec" and "value" in value:
        value = value["value"]

    current = d
    for part in parts[:-1]:
        current = current.setdefault(part, {})

    leaf_key = parts[-1]
    if isinstance(value, dict) and "value" in value and len(value) == 1:
        current[leaf_key] = value["value"]
    else:
        current[leaf_key] = value
