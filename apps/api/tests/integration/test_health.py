"""헬스체크 API 통합 테스트."""

import pytest


@pytest.mark.asyncio
async def test_liveness(client):
    response = await client.get("/api/v1/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_readiness(client):
    response = await client.get("/api/v1/readyz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["checks"]["database"] == "ok"
