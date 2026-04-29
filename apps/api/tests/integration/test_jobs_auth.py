"""작업 큐 API 인증 회귀 테스트."""

import pytest


@pytest.mark.asyncio
async def test_jobs_post_requires_auth(client):
    response = await client.post(
        "/api/v1/jobs",
        json={"task": "sync_channel_products", "params": {}},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_jobs_get_requires_auth(client):
    response = await client.get("/api/v1/jobs/some-job-id")
    assert response.status_code == 401
