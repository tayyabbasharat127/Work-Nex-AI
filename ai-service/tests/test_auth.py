import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi import HTTPException

from app.core.auth import require_principal
from app.core.config import settings


def _token(secret: str, **claims) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"userId": "user-1", "organizationId": "org-1", "role": "EMPLOYEE", "exp": int(time.time()) + 60, **claims}
    encode = lambda value: base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).decode().rstrip("=")
    signing = f"{encode(header)}.{encode(payload)}"
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), signing.encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return f"{signing}.{signature}"


@pytest.mark.asyncio
async def test_requires_bearer_token(monkeypatch):
    monkeypatch.setattr(settings, "JWT_SECRET", "test-secret")
    with pytest.raises(HTTPException) as exc:
        await require_principal(None)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_rejects_invalid_signature(monkeypatch):
    monkeypatch.setattr(settings, "JWT_SECRET", "test-secret")
    with pytest.raises(HTTPException) as exc:
        await require_principal(f"Bearer {_token('wrong-secret')}")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_derives_identity_from_verified_claims(monkeypatch):
    monkeypatch.setattr(settings, "JWT_SECRET", "test-secret")
    principal = await require_principal(f"Bearer {_token('test-secret')}")
    assert (principal.user_id, principal.organization_id, principal.role) == ("user-1", "org-1", "EMPLOYEE")
