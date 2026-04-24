"""채널 공통 인터페이스 및 Capability 선언 (CLAUDE.md §5, §6.3)."""

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol


@dataclass(frozen=True, slots=True)
class ProductPage:
    items: list
    next_cursor: str | None = None
    total: int | None = None


@dataclass(frozen=True, slots=True)
class ExternalId:
    id: str
    url: str | None = None


class ChannelGateway(Protocol):
    async def list_products(self, *, cursor: str | None = None) -> ProductPage: ...
    async def upsert_product(self, product: object) -> ExternalId: ...
    async def update_product(self, external_id: str, product: object) -> None: ...
    async def delete_product(self, external_id: str) -> None: ...
    async def update_inventory(self, sku: str, qty: int) -> None: ...
    async def fetch_orders(self, since: datetime, until: datetime | None = None) -> list: ...


@dataclass(frozen=True, slots=True)
class ChannelCapabilities:
    supports_options: bool = True
    supports_scheduled_publish: bool = False
    supports_bulk_inventory: bool = True
    supports_webhook: bool = False
    supports_partial_update: bool = True
    max_images_per_product: int = 10
    max_option_combinations: int = 100
    order_fetch_min_interval_sec: int = 60
    category_schema: Literal["tree", "flat", "code"] = "tree"
