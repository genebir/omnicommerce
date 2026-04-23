"""인증 API 통합 테스트."""

import uuid

import pytest


def _unique_email() -> str:
    return f"test-{uuid.uuid4().hex[:8]}@example.com"


@pytest.mark.asyncio
async def test_register(client):
    email = _unique_email()
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secure1234", "name": "신규셀러"},
    )
    assert response.status_code == 201
    data = response.json()["data"]
    assert data["email"] == email
    assert data["name"] == "신규셀러"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_register_duplicate(client):
    email = _unique_email()
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secure1234", "name": "셀러1"},
    )
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "other5678", "name": "셀러2"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_login(client):
    email = _unique_email()
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secure1234", "name": "로그인테스트"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "secure1234"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    email = _unique_email()
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secure1234", "name": "테스트"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "wrong_password"},
    )
    assert response.status_code == 401
