"""Gemini AI service wrapper."""
from google import genai
from app.core.config import settings

_client = genai.Client(api_key=settings.GEMINI_API_KEY)
_MODEL = "gemini-2.0-flash-lite"
_MAX_CONTEXT_CHARS = 800


def _build_prompt(message: str, role: str, context: str, user_context: dict) -> str:
    trimmed_context = context[:_MAX_CONTEXT_CHARS]
    return (
        f"You are WorkNex AI, an HR assistant. Role: {role}.\n"
        f"Context: {trimmed_context}\n"
        f"Answer briefly and only about HR topics (leaves, attendance, performance, policies).\n"
        f"Q: {message}\nA:"
    )


async def gemini_answer(message: str, role: str, context: str, user_context: dict) -> str:
    prompt = _build_prompt(message, role, context, user_context)
    response = _client.models.generate_content(model=_MODEL, contents=prompt)
    return response.text.strip()
