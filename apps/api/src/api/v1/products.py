"""상품 API 엔드포인트."""

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from src.api.v1.schemas import ApiResponse, PaginatedResponse, PaginationMeta
from src.core.deps import CurrentUserDep, SessionDep
from src.infra.db.models.product import Product
from src.services.product_service import ProductService

router = APIRouter(prefix="/products")


class ProductCreate(BaseModel):
    sku: str = Field(max_length=100)
    name: str = Field(max_length=500)
    description: str | None = None
    price: float = Field(ge=0)
    cost_price: float | None = None
    category_path: str | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    cost_price: float | None = None
    category_path: str | None = None
    status: str | None = None


class ProductImageResponse(BaseModel):
    id: uuid.UUID
    url: str
    sort_order: int
    alt_text: str | None

    model_config = {"from_attributes": True}


class ProductResponse(BaseModel):
    id: uuid.UUID
    sku: str
    name: str
    description: str | None
    price: float
    cost_price: float | None
    category_path: str | None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class ProductDetailResponse(ProductResponse):
    images: list[ProductImageResponse] = []


@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    session: SessionDep,
    current_user: CurrentUserDep,
    cursor: str | None = Query(None, description="이전 페이지 마지막 항목 ID"),
    limit: int = Query(20, ge=1, le=100),
    q: str | None = Query(None, description="상품명/SKU 검색"),
    status: str | None = Query(None, description="상태 필터"),
):
    base = select(Product).where(Product.deleted_at.is_(None), Product.user_id == current_user.id)
    if q:
        base = base.where(Product.name.ilike(f"%{q}%") | Product.sku.ilike(f"%{q}%"))
    if status:
        base = base.where(Product.status == status)
    query = base.order_by(Product.created_at.desc()).limit(limit + 1)
    if cursor:
        query = query.where(Product.id < uuid.UUID(cursor))
    result = await session.execute(query)
    rows = list(result.scalars().all())

    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = str(items[-1].id) if has_more and items else None

    total_result = await session.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar_one()

    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(next_cursor=next_cursor, has_more=has_more, total=total),
    )


@router.post("", response_model=ApiResponse[ProductResponse], status_code=201)
async def create_product(body: ProductCreate, session: SessionDep, current_user: CurrentUserDep):
    service = ProductService(session)
    product = await service.create(
        user_id=current_user.id,
        sku=body.sku,
        name=body.name,
        price=body.price,
        description=body.description,
        cost_price=body.cost_price,
        category_path=body.category_path,
    )
    return ApiResponse(data=product)


@router.get("/{product_id}", response_model=ApiResponse[ProductDetailResponse])
async def get_product(product_id: uuid.UUID, session: SessionDep, current_user: CurrentUserDep):
    result = await session.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.id == product_id, Product.deleted_at.is_(None), Product.user_id == current_user.id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    return ApiResponse(data=product)


@router.patch("/{product_id}", response_model=ApiResponse[ProductResponse])
async def update_product(product_id: uuid.UUID, body: ProductUpdate, session: SessionDep, current_user: CurrentUserDep):
    service = ProductService(session)
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="수정할 필드가 없습니다")
    existing = await service.get_by_id(product_id)
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    product = await service.update(product_id, **updates)
    return ApiResponse(data=product)


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: uuid.UUID, session: SessionDep, current_user: CurrentUserDep):
    service = ProductService(session)
    existing = await service.get_by_id(product_id)
    if not existing or existing.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    await service.soft_delete(product_id)


class ImageCreate(BaseModel):
    url: str = Field(max_length=1000)
    alt_text: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


@router.post(
    "/{product_id}/images",
    response_model=ApiResponse[ProductImageResponse],
    status_code=201,
)
async def add_product_image(product_id: uuid.UUID, body: ImageCreate, session: SessionDep):
    from src.infra.db.models.product import ProductImage

    product = await session.get(Product, product_id)
    if not product or product.deleted_at:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    image = ProductImage(
        product_id=product_id,
        url=body.url,
        alt_text=body.alt_text,
        sort_order=body.sort_order,
    )
    session.add(image)
    await session.commit()
    await session.refresh(image)
    return ApiResponse(data=image)


@router.delete("/{product_id}/images/{image_id}", status_code=204)
async def delete_product_image(product_id: uuid.UUID, image_id: uuid.UUID, session: SessionDep):
    from src.infra.db.models.product import ProductImage

    result = await session.execute(
        select(ProductImage).where(
            ProductImage.id == image_id,
            ProductImage.product_id == product_id,
        )
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다")
    await session.delete(image)
    await session.commit()
