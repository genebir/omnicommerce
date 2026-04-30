"""상품 등록 ↔ 재고 자동 생성 워크플로 회귀 테스트.

페르소나(컴퓨터 비숙련 1인 셀러) 시점 검증에서 발견된 막힘:
상품을 등록해도 `inventories` 행이 자동 생성되지 않아 `/inventory` 페이지가
빈 화면이었음. 이 테스트는 `POST /products` → 동일 SKU의 default 창고 재고
row(0 quantity)가 자동 생성되는지 보장한다.
"""

import uuid

import pytest


async def _register_login(client, email: str) -> str:
    password = "testpass1234"  # pragma: allowlist secret
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": "셀러"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return resp.json()["data"]["access_token"]


@pytest.mark.asyncio
async def test_create_product_seeds_default_inventory(client):
    """상품 등록하면 default 창고 재고 row가 0으로 자동 생성되어야 한다."""
    token = await _register_login(client, f"seed-{uuid.uuid4().hex[:8]}@example.com")
    client.headers["Authorization"] = f"Bearer {token}"

    sku = f"SEED-{uuid.uuid4().hex[:6]}"
    create = await client.post(
        "/api/v1/products",
        json={"sku": sku, "name": "재고 자동 시드 상품", "price": 9900},
    )
    assert create.status_code == 201

    # 재고 목록에 동일 SKU가 0 quantity로 보여야 한다
    inv_list = await client.get("/api/v1/inventory")
    assert inv_list.status_code == 200
    items = inv_list.json()["data"]
    matched = [it for it in items if it["sku"] == sku]
    assert len(matched) == 1, f"새 상품 SKU {sku}의 재고 row가 자동 생성되지 않음"
    assert matched[0]["warehouse_id"] == "default"
    assert matched[0]["total_quantity"] == 0
    assert matched[0]["allocated"] == 0
    assert matched[0]["available"] == 0

    # SKU별 단건 조회도 정상 동작
    sku_resp = await client.get(f"/api/v1/inventory/{sku}")
    assert sku_resp.status_code == 200
    assert sku_resp.json()["data"]["total_quantity"] == 0

    del client.headers["Authorization"]


@pytest.mark.asyncio
async def test_create_product_seed_is_idempotent(client):
    """기존 inventory row가 있으면 두 번째 등록 시 충돌하지 않고 silent skip."""
    token = await _register_login(client, f"idem-{uuid.uuid4().hex[:8]}@example.com")
    client.headers["Authorization"] = f"Bearer {token}"

    sku = f"IDEM-{uuid.uuid4().hex[:6]}"
    # 1차 등록
    r1 = await client.post(
        "/api/v1/products",
        json={"sku": sku, "name": "첫번째", "price": 1000},
    )
    assert r1.status_code == 201

    # 재고 수동으로 50으로 갱신
    p1_id = r1.json()["data"]["id"]
    upsert = await client.put(
        "/api/v1/inventory",
        json={
            "product_id": p1_id,
            "sku": sku,
            "warehouse_id": "default",
            "total_quantity": 50,
        },
    )
    assert upsert.status_code == 200

    # 같은 SKU로 두 번째 등록 시도 — Product 자체는 SKU unique 제약에 걸리는지
    # 또는 허용되는지에 따라 다름. 어느 쪽이든 inventory 자동 시드가 기존 row의
    # 50을 덮어쓰지 않아야 한다.
    r2 = await client.post(
        "/api/v1/products",
        json={"sku": sku, "name": "두번째", "price": 1000},
    )
    # Product unique(sku) 제약이 있으면 409/400 — 그러면 두 번째 inventory 시드
    # 자체가 일어나지 않으니 검증 PASS.
    if r2.status_code == 201:
        # 등록이 성공했다면 inventory 시드가 silent skip되어 50 유지되어야
        inv = await client.get(f"/api/v1/inventory/{sku}")
        assert inv.status_code == 200
        assert inv.json()["data"]["total_quantity"] == 50

    del client.headers["Authorization"]
