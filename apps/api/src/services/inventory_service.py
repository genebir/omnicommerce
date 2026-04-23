"""재고 유스케이스 서비스."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.infra.db.models.inventory import Inventory


class InventoryService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_sku(self, sku: str, warehouse_id: str = "default") -> Inventory | None:
        result = await self._session.execute(
            select(Inventory).where(
                Inventory.sku == sku,
                Inventory.warehouse_id == warehouse_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_product(self, product_id: uuid.UUID) -> list[Inventory]:
        result = await self._session.execute(select(Inventory).where(Inventory.product_id == product_id))
        return list(result.scalars().all())

    async def create_or_update(
        self,
        *,
        product_id: uuid.UUID,
        sku: str,
        warehouse_id: str = "default",
        total_quantity: int,
    ) -> Inventory:
        existing = await self.get_by_sku(sku, warehouse_id)
        if existing:
            diff = total_quantity - existing.total_quantity
            existing.total_quantity = total_quantity
            existing.available = max(0, existing.available + diff)
            await self._session.commit()
            await self._session.refresh(existing)
            return existing

        inventory = Inventory(
            product_id=product_id,
            sku=sku,
            warehouse_id=warehouse_id,
            total_quantity=total_quantity,
            allocated=0,
            available=total_quantity,
        )
        self._session.add(inventory)
        await self._session.commit()
        await self._session.refresh(inventory)
        return inventory

    async def allocate(self, sku: str, qty: int, warehouse_id: str = "default") -> Inventory:
        inv = await self.get_by_sku(sku, warehouse_id)
        if not inv:
            raise ValueError(f"SKU '{sku}'의 재고를 찾을 수 없습니다")
        if qty > inv.available:
            raise ValueError(f"가용 재고({inv.available}) 부족: {qty}개 할당 불가")
        inv.allocated += qty
        inv.available -= qty
        await self._session.commit()
        await self._session.refresh(inv)
        return inv

    async def deallocate(self, sku: str, qty: int, warehouse_id: str = "default") -> Inventory:
        inv = await self.get_by_sku(sku, warehouse_id)
        if not inv:
            raise ValueError(f"SKU '{sku}'의 재고를 찾을 수 없습니다")
        if qty > inv.allocated:
            raise ValueError(f"할당 재고({inv.allocated}) 부족: {qty}개 해제 불가")
        inv.allocated -= qty
        inv.available += qty
        await self._session.commit()
        await self._session.refresh(inv)
        return inv
