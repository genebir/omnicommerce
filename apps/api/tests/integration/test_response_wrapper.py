"""§7 공통 응답 래퍼 + RFC 7807 에러 형식 통합 테스트."""

import uuid

import pytest


@pytest.mark.asyncio
async def test_paginated_response_has_data_and_meta(auth_client):
    """목록 엔드포인트는 data + meta(next_cursor, has_more, total) 구조."""
    response = await auth_client.get("/api/v1/products")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    meta = body["meta"]
    assert "next_cursor" in meta
    assert "has_more" in meta
    assert "total" in meta


@pytest.mark.asyncio
async def test_single_item_response_wrapped(client):
    """단건 응답도 { "data": ... } 래퍼."""
    response = await client.get("/api/v1/channels/types")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)


@pytest.mark.asyncio
async def test_auth_register_wrapped(client):
    """인증 응답도 { "data": ... } 래퍼."""
    email = f"wrapper-{uuid.uuid4().hex[:8]}@example.com"
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "secure1234", "name": "래퍼검증"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "data" in body
    assert body["data"]["email"] == email


@pytest.mark.asyncio
async def test_config_ui_wrapped(client):
    """설정 응답도 { "data": ... } 래퍼."""
    response = await client.get("/api/v1/config/ui")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "ui" in body["data"]
    assert "features" in body["data"]


@pytest.mark.asyncio
async def test_error_rfc7807_format(auth_client):
    """에러 응답은 RFC 7807 Problem Details 형식."""
    response = await auth_client.get(f"/api/v1/products/{uuid.uuid4()}")
    assert response.status_code == 404
    body = response.json()
    assert "type" in body
    assert "title" in body
    assert "status" in body
    assert body["status"] == 404
    assert "detail" in body
    assert "instance" in body


@pytest.mark.asyncio
async def test_validation_error_rfc7807(client):
    """Pydantic 유효성 에러도 RFC 7807."""
    response = await client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "password": "x"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["status"] == 422
    assert "type" in body
    assert "title" in body
