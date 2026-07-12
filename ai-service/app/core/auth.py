"""JWT authentication shared with the main WorkNex backend."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from contextvars import ContextVar

from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings

_current_token: ContextVar[str] = ContextVar("current_verified_token", default="")


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    user_id: str
    organization_id: str
    role: str
    token: str
    service: bool = False


def _decode_segment(value: str) -> dict:
    try:
        return json.loads(base64.urlsafe_b64decode(value + "=" * (-len(value) % 4)))
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc


def _verify_token(token: str) -> dict:
    if not settings.JWT_SECRET:
        raise HTTPException(status_code=503, detail="JWT verification is not configured")
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Invalid access token")
    header, payload = _decode_segment(parts[0]), _decode_segment(parts[1])
    if header.get("alg") != "HS256" or header.get("typ", "JWT") != "JWT":
        raise HTTPException(status_code=401, detail="Unsupported access token")
    expected = hmac.new(settings.JWT_SECRET.encode(), f"{parts[0]}.{parts[1]}".encode(), hashlib.sha256).digest()
    try:
        supplied = base64.urlsafe_b64decode(parts[2] + "=" * (-len(parts[2]) % 4))
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    if not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="Invalid access token")
    now = int(time.time())
    if not isinstance(payload.get("exp"), (int, float)) or payload["exp"] <= now:
        raise HTTPException(status_code=401, detail="Access token expired")
    if payload.get("nbf") and payload["nbf"] > now:
        raise HTTPException(status_code=401, detail="Access token not active")
    return payload


async def require_principal(authorization: str | None = Header(default=None)) -> AuthenticatedPrincipal:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer access token required")
    token = authorization[7:].strip()
    claims = _verify_token(token)
    is_service = claims.get("tokenType") == "ai-service"
    user_id = str(claims.get("userId") or claims.get("sub") or "")
    organization_id = str(claims.get("organizationId") or "")
    role = str(claims.get("role") or "")
    if not is_service and (not user_id or not organization_id or not role):
        raise HTTPException(status_code=401, detail="Access token is missing identity claims")
    if is_service and not organization_id:
        raise HTTPException(status_code=401, detail="Service token is missing organization scope")
    _current_token.set(token)
    return AuthenticatedPrincipal(user_id, organization_id, role, token, is_service)


def get_current_token() -> str:
    return _current_token.get()


async def require_user(principal: AuthenticatedPrincipal = Depends(require_principal)) -> AuthenticatedPrincipal:
    if principal.service:
        raise HTTPException(status_code=403, detail="A user access token is required")
    return principal
