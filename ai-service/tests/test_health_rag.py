"""Regression coverage for demo health architecture and grounded policy retrieval."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.rag_service import answer


client = TestClient(app)


def test_public_liveness_is_minimal():
    response = client.get("/health/live")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "models" not in payload
    assert "providerMode" not in payload


def test_readiness_and_prediction_require_authentication():
    assert client.get("/health/ready").status_code == 401
    assert client.get("/health/models").status_code == 401
    assert client.get("/predict/leave-forecast").status_code == 401


def test_authenticated_provider_status_never_requires_optional_langchain():
    from app.core.auth import require_principal

    app.dependency_overrides[require_principal] = lambda: {
        "userId": "demo-user",
        "organizationId": "demo-org",
        "role": "ADMIN",
    }
    try:
        response = client.get("/chat/status")
        assert response.status_code == 200
        assert response.json()["mode"] in {"langchain", "statistical"}
    finally:
        app.dependency_overrides.pop(require_principal, None)


@pytest.mark.asyncio
async def test_policy_retrieval_is_grounded_and_cited():
    result = await answer("What is the annual leave policy?", role="EMPLOYEE")
    assert result["answer"]
    assert result["sources"]
    assert "leave_policy.md" in result["sources"]
    assert 0 < result["confidence"] <= 1
    assert result["fallback"] is False


@pytest.mark.asyncio
async def test_unknown_policy_context_is_explicit():
    result = await answer("zxqv completely unrelated quantum cafeteria rule", role="EMPLOYEE")
    assert result["answer"]
    assert result["confidence"] <= 0.5
