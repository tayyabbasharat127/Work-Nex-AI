"""Grounded RAG service with Gemini and deterministic fallback."""
from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

from app.core.config import settings


ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_DIR = ROOT / "knowledge"
JSON_INDEX = ROOT / "vector_store" / "knowledge_index.json"


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _load_chunks() -> list[dict[str, str]]:
    if JSON_INDEX.exists():
        try:
            return json.loads(JSON_INDEX.read_text(encoding="utf-8"))
        except Exception:
            pass

    chunks: list[dict[str, str]] = []
    for path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = re.sub(r"\s+", " ", path.read_text(encoding="utf-8")).strip()
        if text:
            chunks.append({"id": path.name, "source": path.name, "text": text[:1400]})
    return chunks


def _score(query: str, chunk: str) -> float:
    q = Counter(_tokens(query))
    c = Counter(_tokens(chunk))
    if not q or not c:
        return 0.0
    overlap = sum(min(q[token], c[token]) for token in q)
    return overlap / math.sqrt(sum(q.values()) * sum(c.values()))


def retrieve(message: str, limit: int = 3) -> list[dict[str, Any]]:
    ranked = []
    for chunk in _load_chunks():
        score = _score(message, chunk["text"])
        if score > 0:
            ranked.append({**chunk, "score": score})
    return sorted(ranked, key=lambda item: item["score"], reverse=True)[:limit]


def _intent_actions(message: str, role: str) -> list[dict[str, str]]:
    text = message.lower()
    actions: list[dict[str, str]] = []
    if "leave balance" in text:
        actions.append({"type": "navigate", "label": "Open leave balances", "path": "/dashboard/employee/leaves"})
    if "attendance" in text:
        path = "/dashboard/manager/attendance" if role == "MANAGER" else "/dashboard/employee/attendance"
        actions.append({"type": "navigate", "label": "Open attendance", "path": path})
    if "draft" in text and "leave" in text:
        actions.append({"type": "draft_leave_request", "label": "Draft only; user confirmation required"})
    return actions


async def answer(message: str, role: str = "EMPLOYEE", user_context: dict | None = None) -> dict[str, Any]:
    user_context = user_context or {}
    chunks = retrieve(message)
    actions = _intent_actions(message, role)
    sources = sorted({chunk["source"] for chunk in chunks}) if chunks else []

    if settings.AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        from app.services.gemini_service import gemini_answer
        context = chunks[0]["text"] if chunks else "No specific policy documents found."
        try:
            answer_text = await gemini_answer(message, role, context, user_context)
            return {
                "answer": answer_text,
                "message": answer_text,
                "sources": sources,
                "confidence": 0.92,
                "actions": actions,
                "fallback": False,
            }
        except Exception as e:
            answer_text = f"Gemini error: {e}. Falling back to static response."
            return {
                "answer": answer_text,
                "message": answer_text,
                "sources": [],
                "confidence": 0.0,
                "actions": actions,
                "fallback": True,
            }

    if not chunks:
        return {
            "answer": "I do not have enough policy context to answer that safely. Ask about leave policy, attendance policy, role permissions, dashboards, or Power BI setup.",
            "message": "I do not have enough policy context to answer that safely. Ask about leave policy, attendance policy, role permissions, dashboards, or Power BI setup.",
            "sources": [],
            "confidence": 0.25,
            "actions": actions,
            "fallback": True,
        }

    context = " ".join(chunk["text"] for chunk in chunks)
    sentences = re.split(r"(?<=[.!?])\s+", context)
    query_tokens = set(_tokens(message))
    selected = [s for s in sentences if query_tokens.intersection(_tokens(s))][:4]
    if not selected:
        selected = sentences[:3]
    answer_text = " ".join(selected).strip()
    if role == "EMPLOYEE" and any(word in message.lower() for word in ["team", "all employees", "organization"]):
        answer_text += " Employee access is self-scoped, so team or organization-wide data must be requested by a manager or admin."

    confidence = min(0.88, 0.45 + sum(chunk["score"] for chunk in chunks))
    return {
        "answer": answer_text,
        "message": answer_text,
        "sources": sources,
        "confidence": round(confidence, 2),
        "actions": actions,
        "fallback": True,
    }
