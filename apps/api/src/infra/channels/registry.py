"""채널 레지스트리 — 채널 구현체의 자가 등록 패턴 (CLAUDE.md §6.2)."""

from typing import TYPE_CHECKING

from src.core.exceptions import UnknownChannelError

if TYPE_CHECKING:
    from src.infra.channels.base import ChannelGateway

_registry: dict[str, type["ChannelGateway"]] = {}


def register(code: str):
    def deco(cls: type["ChannelGateway"]):
        if code in _registry:
            raise RuntimeError(f"중복 채널 등록: {code}")
        _registry[code] = cls
        return cls

    return deco


def get(code: str) -> type["ChannelGateway"]:
    if code not in _registry:
        raise UnknownChannelError(code)
    return _registry[code]


def all_codes() -> list[str]:
    return sorted(_registry)
