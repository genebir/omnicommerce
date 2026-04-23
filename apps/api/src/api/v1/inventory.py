"""재고 API 엔드포인트."""

import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from src.api.v1.schemas import ApiResponse, PaginatedResponse, PaginationMeta
from src.core.deps import CurrentUserDep, SessionDep
from src.infra.db.models.inventory import Inventory
from src.infra.db.models.product import Product
from src.services.inventory_service import InventoryService

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
