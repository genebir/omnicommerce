"""상품 유스케이스 서비스."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infra.db.models.inventory import Inventory
from src.infra.db.models.product import Product

# 상품 등록 시 자동 생성하는 기본 창고 ID — Inventory.warehouse_id의 default와 일치.
# 셀러가 명시적으로 다른 창고를 추가하기 전까지 단일 창고 워크플로를 가정한다.
DEFAULT_WAREHOUSE_ID = "default"


class ProductService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        sku: str,
        name: str,
        price: float,
        description: str | None = None,
        cost_price: float | None = None,
        category_path: str | None = None,
    ) -> Product:
        product = Product(
            user_id=user_id,
            sku=sku,
            name=name,
            price=price,
            description=description,
            cost_price=cost_price,
            category_path=category_path,
        )
        self._session.add(product)
        await self._session.flush()  # product.id 확보

        # 페르소나(컴퓨터 비숙련 1인 셀러)가 상품 등록 후 재고 페이지에서 빈 화면을
        # 보고 막히던 워크플로를 차단하기 위해, default 창고 재고 row를 0으로 시드한다.
        # uq_inventory_sku_warehouse(sku, warehouse_id) 제약 — 다른 사용자가 같은 SKU+
        # 창고를 이미 점유 중이면 충돌. SKU는 본래 사용자 단위로 고유해야 하나 현재
        # 스키마는 글로벌 unique이므로, 충돌 시 기존 row를 그대로 두고 silent skip한다.
        existing = await self._session.execute(
            select(Inventory).where(
                Inventory.sku == sku,
                Inventory.warehouse_id == DEFAULT_WAREHOUSE_ID,
            )
        )
        if existing.scalar_one_or_none() is None:
            self._session.add(
                Inventory(
                    product_id=product.id,
                    sku=sku,
                    warehouse_id=DEFAULT_WAREHOUSE_ID,
                    total_quantity=0,
                    allocated=0,
                    available=0,
                )
            )

        await self._session.commit()
        await self._session.refresh(product)
        return product

    async def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        product = await self._session.get(Product, product_id)
        if product and product.deleted_at is not None:
            return None
        return product

    async def list_by_user(
        self, user_id: uuid.UUID, *, limit: int = 20, cursor: uuid.UUID | None = None
    ) -> list[Product]:
        query = (
            select(Product)
            .where(Product.user_id == user_id, Product.deleted_at.is_(None))
            .order_by(Product.created_at.desc())
            .limit(limit)
        )
        if cursor:
            query = query.where(Product.id < cursor)
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def update(self, product_id: uuid.UUID, **kwargs) -> Product | None:
        product = await self.get_by_id(product_id)
        if not product:
            return None
        for key, value in kwargs.items():
            if hasattr(product, key):
                setattr(product, key, value)
        await self._session.commit()
        await self._session.refresh(product)
        return product

    async def soft_delete(self, product_id: uuid.UUID) -> bool:
        from sqlalchemy import update

        from src.infra.db.models.channel_listing import ChannelListing
        from src.utils.clock import now

        product = await self.get_by_id(product_id)
        if not product:
            return False

        ts = now()
        product.deleted_at = ts
        await self._session.execute(
            update(ChannelListing)
            .where(ChannelListing.product_id == product_id, ChannelListing.deleted_at.is_(None))
            .values(deleted_at=ts)
        )
        await self._session.commit()
        return True
