"""신규 상품 등록 시 default status가 ACTIVE인지 회귀 검증.

페르소나(컴퓨터 비숙련 1인 셀러)가 상품 등록 직후 "비활성" 배지를 보고
"왜 비활성?"하고 막히던 회귀를 차단한다. 외부 채널 매핑(페이즈 5에서 정규화)
도 동일하게 대문자 ACTIVE/INACTIVE를 사용하므로 일관성 유지.
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
async def test_new_product_starts_active(client):
    """POST /products로 새로 만든 상품의 status는 ACTIVE이어야 한다."""
    token = await _register_login(client, f"st-{uuid.uuid4().hex[:8]}@example.com")
    client.headers["Authorization"] = f"Bearer {token}"

    sku = f"ST-{uuid.uuid4().hex[:6]}"
    create = await client.post(
        "/api/v1/products",
        json={"sku": sku, "name": "활성 시작 상품", "price": 1000},
    )
    assert create.status_code == 201
    assert create.json()["data"]["status"] == "ACTIVE"

    # 목록 조회로도 ACTIVE 확인 (status 필터 등에서 회귀 잡힘)
    list_resp = await client.get("/api/v1/products")
    assert list_resp.status_code == 200
    matching = [p for p in list_resp.json()["data"] if p["sku"] == sku]
    assert len(matching) == 1
    assert matching[0]["status"] == "ACTIVE"

    del client.headers["Authorization"]
