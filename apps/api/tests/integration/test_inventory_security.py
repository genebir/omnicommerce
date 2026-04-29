"""재고 API user 스코핑 회귀 테스트 — 인증/소유권 격리 검증."""

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


async def _create_product_with_inventory(client, name: str, sku: str) -> dict:
    create = await client.post(
        "/api/v1/products",
        json={"sku": sku, "name": name, "price": 1000},
    )
    assert create.status_code == 201
    product = create.json()["data"]

    upsert = await client.put(
        "/api/v1/inventory",
        json={
            "product_id": product["id"],
            "sku": sku,
            "warehouse_id": "default",
            "total_quantity": 50,
        },
    )
    assert upsert.status_code == 200
    return {"product": product, "sku": sku}


@pytest.mark.asyncio
async def test_inventory_endpoints_require_auth(client):
    """모든 inventory 엔드포인트는 인증을 요구해야 한다."""
    sku = f"NO-AUTH-{uuid.uuid4().hex[:6]}"
    pid = uuid.uuid4()
    fake_body = {
        "product_id": str(pid),
        "sku": sku,
        "warehouse_id": "default",
        "total_quantity": 10,
    }
    alloc_body = {"sku": sku, "quantity": 1, "warehouse_id": "default"}

    assert (await client.get("/api/v1/inventory")).status_code == 401
    assert (await client.get(f"/api/v1/inventory/{sku}")).status_code == 401
    assert (await client.get(f"/api/v1/inventory/product/{pid}")).status_code == 401
    assert (await client.put("/api/v1/inventory", json=fake_body)).status_code == 401
    assert (await client.post("/api/v1/inventory/allocate", json=alloc_body)).status_code == 401
    assert (await client.post("/api/v1/inventory/deallocate", json=alloc_body)).status_code == 401


@pytest.mark.asyncio
async def test_inventory_isolated_per_user(client):
    """사용자 A의 SKU/상품 재고를 사용자 B가 절대 조회/수정 못 한다."""
    token_a = await _register_login(client, f"a-{uuid.uuid4().hex[:8]}@example.com")
    token_b = await _register_login(client, f"b-{uuid.uuid4().hex[:8]}@example.com")

    # A가 SKU 등록
    client.headers["Authorization"] = f"Bearer {token_a}"
    sku_a = f"OWNED-A-{uuid.uuid4().hex[:6]}"
    setup_a = await _create_product_with_inventory(client, "A 상품", sku_a)
    pid_a = setup_a["product"]["id"]

    # B의 토큰으로 A의 재고에 접근 시도 → 모두 404
    client.headers["Authorization"] = f"Bearer {token_b}"

    assert (await client.get(f"/api/v1/inventory/{sku_a}")).status_code == 404
    assert (await client.get(f"/api/v1/inventory/product/{pid_a}")).status_code == 404
    assert (
        await client.put(
            "/api/v1/inventory",
            json={
                "product_id": pid_a,
                "sku": sku_a,
                "warehouse_id": "default",
                "total_quantity": 999,
            },
        )
    ).status_code == 404
    assert (
        await client.post(
            "/api/v1/inventory/allocate",
            json={"sku": sku_a, "quantity": 1, "warehouse_id": "default"},
        )
    ).status_code == 404
    assert (
        await client.post(
            "/api/v1/inventory/deallocate",
            json={"sku": sku_a, "quantity": 1, "warehouse_id": "default"},
        )
    ).status_code == 404

    # B의 목록은 비어있어야 한다 (A의 SKU가 노출되면 안 됨)
    list_b = await client.get("/api/v1/inventory")
    assert list_b.status_code == 200
    skus_b = [it["sku"] for it in list_b.json()["data"]]
    assert sku_a not in skus_b

    # A 본인은 조회 가능
    client.headers["Authorization"] = f"Bearer {token_a}"
    own = await client.get(f"/api/v1/inventory/{sku_a}")
    assert own.status_code == 200
    assert own.json()["data"]["sku"] == sku_a

    del client.headers["Authorization"]
