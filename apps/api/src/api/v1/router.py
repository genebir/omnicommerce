"""v1 API 라우터 집합."""

from fastapi import APIRouter

from src.api.v1 import admin, auth, channels, config, dashboard, health, inventory, jobs, orders, products

router = APIRouter(prefix="/api/v1")
router.include_router(health.router, tags=["헬스체크"])
router.include_router(auth.router)
router.include_router(config.router, tags=["설정"])
router.include_router(products.router, tags=["상품"])
router.include_router(orders.router, tags=["주문"])
router.include_router(inventory.router, tags=["재고"])
router.include_router(channels.router, tags=["채널"])
router.include_router(jobs.router)
router.include_router(dashboard.router, tags=["대시보드"])
router.include_router(admin.router, tags=["관리자"])
