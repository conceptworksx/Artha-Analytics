import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_security_headers(async_client: AsyncClient):
    response = await async_client.get("/")
    assert response.status_code == 200

    # Assert headers exist
    headers = response.headers
    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert (
        headers.get("Strict-Transport-Security")
        == "max-age=31536000; includeSubDomains"
    )
    assert headers.get("X-XSS-Protection") == "1; mode=block"


@pytest.mark.asyncio
async def test_cors_headers(async_client: AsyncClient):
    response = await async_client.options(
        "/",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    # Assert we don't have allow_credentials=true combined with wildcard origin
    if response.headers.get("Access-Control-Allow-Origin") == "*":
        assert response.headers.get("Access-Control-Allow-Credentials") != "true"
