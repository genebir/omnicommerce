"""재고 API 엔드포인트."""

import contextlib
import uuid
from typing import Annotated, Literal

import structlog
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from src.api.v1.schemas import ApiResponse, PaginatedResponse, PaginationMeta
from src.core.deps import CurrentUserDep, SessionDep
from src.infra.db.models.channel import Channel
from src.infra.db.models.channel_listing import ChannelListing
from src.infra.db.models.inventory import Inventory
from src.infra.db.models.product import Product
from src.services.inventory_service import InventoryService
from src.utils.clock import now

logger = structlog.stdlib.get_logger()

router = APIRouter(prefix="/inventory")


class InventoryResponse(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    sku: str
    warehouse_id: str
    total_quantity: int
    allocated: int
    available: int

    model_config = {"from_attributes": True}


class InventoryUpsert(BaseModel):
    product_id: uuid.UUID
    sku: str = Field(max_length=100)
    warehouse_id: str = "default"
    total_quantity: int = Field(ge=0)


class AllocateRequest(BaseModel):
    sku: str
    quantity: int = Field(gt=0)
    warehouse_id: str = "default"


def _user_inventory_where(current_user_id: uuid.UUID):
    """재고를 소유자 기준으로 필터링하는 공통 조건."""
    return [
        Inventory.deleted_at.is_(None),
        Product.user_id == current_user_id,
        Product.deleted_at.is_(None),
    ]


@router.get("", response_model=PaginatedResponse[InventoryResponse])
async def list_inventory(
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = Query(50, ge=1, le=200),
):
    conditions = _user_inventory_where(current_user.id)
    base = select(Inventory).join(Product, Inventory.product_id == Product.id).where(*conditions)
    result = await session.execute(base.order_by(Inventory.sku).limit(limit))
    items = list(result.scalars().all())

    total = (await session.execute(select(func.count()).select_from(base.subquery()))).scalar_one()
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(total=total),
    )


@router.get("/{sku}", response_model=ApiResponse[InventoryResponse])
async def get_inventory(sku: str, session: SessionDep, warehouse_id: str = "default"):
    service = InventoryService(session)
    inv = await service.get_by_sku(sku, warehouse_id)
    if not inv:
        raise HTTPException(status_code=404, detail="재고를 찾을 수 없습니다")
    return ApiResponse(data=inv)


@router.get("/product/{product_id}", response_model=ApiResponse[list[InventoryResponse]])
async def list_product_inventory(product_id: uuid.UUID, session: SessionDep):
    service = InventoryService(session)
    items = await service.list_by_product(product_id)
    return ApiResponse(data=items)


@router.put("", response_model=ApiResponse[InventoryResponse])
async def upsert_inventory(body: InventoryUpsert, session: SessionDep):
    service = InventoryService(session)
    inv = await service.create_or_update(
        product_id=body.product_id,
        sku=body.sku,
        warehouse_id=body.warehouse_id,
        total_quantity=body.total_quantity,
    )
    return ApiResponse(data=inv)


@router.post("/allocate", response_model=ApiResponse[InventoryResponse])
async def allocate_inventory(body: AllocateRequest, session: SessionDep):
    service = InventoryService(session)
    try:
        inv = await service.allocate(body.sku, body.quantity, body.warehouse_id)
        return ApiResponse(data=inv)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/deallocate", response_model=ApiResponse[InventoryResponse])
async def deallocate_inventory(body: AllocateRequest, session: SessionDep):
    service = InventoryService(session)
    try:
        inv = await service.deallocate(body.sku, body.quantity, body.warehouse_id)
        return ApiResponse(data=inv)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


# ===== 재고 일괄 조정 =====


class BulkInventoryEditRequest(BaseModel):
    inventory_ids: list[uuid.UUID] = Field(min_length=1, max_length=500)
    mode: Annotated[Literal["absolute", "inc_amount"], Field()]
    """absolute: value를 새 total로 / inc_amount: 현재 total에 value 더함(음수=감산)"""

    value: int
    sync_channels: bool = True
    channel_types: list[str] = Field(default_factory=list)


class ChannelSyncResult(BaseModel):
    channel_type: str
    success: bool
    error: str | None = None
    requires_reconnect: bool = False


class BulkInventoryItemResult(BaseModel):
    inventory_id: uuid.UUID
    sku: str
    old_total: int
    new_total: int
    old_available: int
    new_available: int
    channel_results: list[ChannelSyncResult] = []


class BulkInventoryEditResult(BaseModel):
    updated_count: int
    sync_attempted: bool
    items: list[BulkInventoryItemResult]


def _new_total(current: int, mode: str, value: int) -> int:
    if mode == "absolute":
        return max(0, value)
    return max(0, current + value)


@router.patch("/bulk", response_model=ApiResponse[BulkInventoryEditResult])
async def bulk_edit_inventory(body: BulkInventoryEditRequest, session: SessionDep, current_user: CurrentUserDep):
    """선택된 재고 행의 총수량을 일괄 변경하고 채널에 동기화한다.

    - 모드: absolute(새 수량) / inc_amount(현재에 +-)
    - 가용수량(available)도 같은 차이만큼 조정 — 음수 방지
    - sync_channels=True면 각 SKU의 채널 listing에 update_inventory 호출
    """
    invs_q = await session.execute(
        select(Inventory)
        .join(Product, Inventory.product_id == Product.id)
        .where(
            Inventory.id.in_(body.inventory_ids),
            Inventory.deleted_at.is_(None),
            Product.user_id == current_user.id,
            Product.deleted_at.is_(None),
        )
    )
    invs = list(invs_q.scalars().all())

    items: list[BulkInventoryItemResult] = []
    for inv in invs:
        old_total = inv.total_quantity
        old_available = inv.available
        new_total = _new_total(old_total, body.mode, body.value)
        diff = new_total - old_total

        if diff != 0:
            inv.total_quantity = new_total
            inv.available = max(0, old_available + diff)

        channel_results: list[ChannelSyncResult] = []
        if body.sync_channels and diff != 0:
            channel_results = [
                ChannelSyncResult(**r)
                for r in await _sync_inventory_to_channels(session, inv, current_user.id, body.channel_types or None)
            ]

        items.append(
            BulkInventoryItemResult(
                inventory_id=inv.id,
                sku=inv.sku,
                old_total=old_total,
                new_total=new_total,
                old_available=old_available,
                new_available=inv.available,
                channel_results=channel_results,
            )
        )

    await session.commit()
    return ApiResponse(
        data=BulkInventoryEditResult(updated_count=len(items), sync_attempted=body.sync_channels, items=items)
    )


async def _sync_inventory_to_channels(
    session, inv: Inventory, user_id: uuid.UUID, channel_types: list[str] | None
) -> list[dict]:
    """변경된 재고를 채널에 푸시. SKU 기준."""
    from src.core.exceptions import AuthenticationError, ChannelResourceNotFoundError
    from src.infra.channels.factory import create_gateway

    listing_q = select(ChannelListing).where(
        ChannelListing.product_id == inv.product_id,
        ChannelListing.deleted_at.is_(None),
    )
    if channel_types:
        listing_q = listing_q.where(ChannelListing.channel_type.in_(channel_types))
    listings = list((await session.execute(listing_q)).scalars().all())

    results: list[dict] = []
    for listing in listings:
        ch = (
            await session.execute(
                select(Channel).where(
                    Channel.user_id == user_id,
                    Channel.channel_type == listing.channel_type,
                    Channel.deleted_at.is_(None),
                    Channel.is_active.is_(True),
                )
            )
        ).scalar_one_or_none()
        if not ch:
            results.append({"channel_type": listing.channel_type, "success": False, "error": "채널 미연결"})
            continue

        gateway = None
        try:
            gateway = create_gateway(ch, session)
            await gateway.update_inventory(inv.sku, inv.total_quantity, external_id=listing.external_id)
            listing.last_synced_at = now()
            results.append({"channel_type": listing.channel_type, "success": True})
        except AuthenticationError:
            ch.is_active = False
            results.append(
                {
                    "channel_type": listing.channel_type,
                    "success": False,
                    "error": "채널 인증 만료",
                    "requires_reconnect": True,
                }
            )
        except ChannelResourceNotFoundError:
            results.append({"channel_type": listing.channel_type, "success": False, "error": "채널에 SKU 없음"})
        except Exception as exc:
            results.append({"channel_type": listing.channel_type, "success": False, "error": str(exc)})
        finally:
            if gateway:
                with contextlib.suppress(Exception):
                    await gateway.close()
    return results
