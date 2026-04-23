"""채널 모듈 자동 로드 — 부팅 시 하위 모듈의 @register 데코레이터가 실행됨."""

import contextlib
import importlib
from pathlib import Path

_this_dir = Path(__file__).parent

for child in sorted(_this_dir.iterdir()):
    if child.is_dir() and not child.name.startswith("_"):
        gateway_module = f"src.infra.channels.{child.name}.gateway"
        with contextlib.suppress(ModuleNotFoundError):
            importlib.import_module(gateway_module)
