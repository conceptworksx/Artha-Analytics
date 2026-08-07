import pytest
from httpx import AsyncClient
from api.main import app
from api.dependencies import get_auth_service
from services.auth_service import AuthService
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_auth_service():
    mock = MagicMock(spec=AuthService)
    # Configure mock responses if needed
    mock.login_user = AsyncMock(
        return_value=(
            "fake_token",
            {"id": "1", "email": "test@example.com", "name": "Test"},
        )
    )
    return mock


@pytest.fixture(autouse=True)
def override_dependencies(mock_auth_service):
    app.dependency_overrides[get_auth_service] = lambda: mock_auth_service
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_signup_password_complexity(async_client: AsyncClient):
    payload = {
        "email": "test@example.com",
        "password": "weakpassword",  # missing uppercase and numbers
        "name": "Test User",
    }
    response = await async_client.post("/auth/signup", json=payload)
    assert response.status_code == 422
    assert "Password must contain at least one uppercase letter" in response.text


@pytest.mark.asyncio
async def test_signup_name_length(async_client: AsyncClient):
    payload = {
        "email": "test@example.com",
        "password": "StrongPassword123",
        "name": "A" * 101,  # exceeds 100 char limit
    }
    response = await async_client.post("/auth/signup", json=payload)
    assert response.status_code == 422
    assert "String should have at most 100 characters" in response.text


@pytest.mark.asyncio
async def test_auth_rate_limiting(async_client: AsyncClient):
    payload = {"email": "test@example.com", "password": "StrongPassword123"}

    # Send 5 requests (should pass limit or fail gracefully depending on mock, but not 429)
    for _ in range(5):
        response = await async_client.post("/auth/login", json=payload)
        assert response.status_code != 429

    # 6th request should hit the 5/minute limit
    response = await async_client.post("/auth/login", json=payload)
    assert response.status_code == 429
    assert response.json()["detail"]["error"] == "app_rate_limit"
