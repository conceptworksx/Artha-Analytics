import pytest
from httpx import AsyncClient
from api.main import app
from api.dependencies import get_analysis_service
from services.analysis_service import AnalysisService
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_analysis_service():
    mock = MagicMock(spec=AnalysisService)
    # By default, pretend it throws an unexpected exception for the data leakage test
    mock.run_analysis = AsyncMock(
        side_effect=Exception("Secret internal database error")
    )
    mock.get_ip_search_count = AsyncMock(return_value=0)
    mock.validate_api_keys = MagicMock(return_value=None)
    mock.validate_ticker_format = MagicMock(return_value=None)
    mock.validate_ticker_exists = AsyncMock(return_value=None)
    mock.get_user_analyses = AsyncMock(return_value=[])
    return mock


@pytest.fixture(autouse=True)
def override_dependencies(mock_analysis_service):
    app.dependency_overrides[get_analysis_service] = lambda: mock_analysis_service
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_analyze_unauthorized_missing_api_key(
    async_client: AsyncClient, mock_analysis_service
):
    from core.exceptions import InvalidAPIKeyError

    mock_analysis_service.validate_api_keys.side_effect = InvalidAPIKeyError(
        "OpenRouter API key is required."
    )

    payload = {"ticker": "RELIANCE.NS"}
    # No OpenRouter-API-Key header and no auth token
    response = await async_client.post("/analyze", json=payload)

    assert response.status_code == 401
    assert "OpenRouter API key is required" in response.text


from unittest.mock import patch


@pytest.mark.asyncio
@patch("api.routes.asyncio.to_thread")
async def test_analyze_unexpected_exception_handler(
    mock_to_thread, async_client: AsyncClient, mock_analysis_service
):
    mock_to_thread.side_effect = Exception("Secret internal database error")

    payload = {"ticker": "TCS.NS"}
    headers = {"OpenRouter-API-Key": "sk-dummy"}

    response = await async_client.post("/analyze", json=payload, headers=headers)

    # Should catch the raw Exception and return a generic 500 error
    assert response.status_code == 500
    data = response.json()
    assert data["detail"]["error"] == "unexpected_error"
    assert data["detail"]["message"] == "An unexpected error occurred"
    assert "Secret internal database error" not in response.text
