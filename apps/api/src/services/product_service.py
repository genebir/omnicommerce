"""상품 유스케이스 서비스."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infra.db.models.product import Product


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
        from src.utils.clock import now

        product = await self.get_by_id(product_id)
        if not product:
            return False
        product.deleted_at = now()
        await self._session.commit()
        return True
