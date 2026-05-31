"""LangChain Agentic AI — WorkNex HR assistant with real backend tools."""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Optional

import httpx
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.tools import tool
from langchain_core.language_models import BaseChatModel

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LLM factory — picks first available provider
# ---------------------------------------------------------------------------

def build_llm() -> Optional[BaseChatModel]:
    if settings.OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        model = settings.LANGCHAIN_MODEL or "gpt-4o-mini"
        logger.info("LangChain LLM: OpenAI %s", model)
        return ChatOpenAI(model=model, api_key=settings.OPENAI_API_KEY, temperature=0.2)

    if settings.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        model = settings.LANGCHAIN_MODEL or "gemini-1.5-flash"
        logger.info("LangChain LLM: Gemini %s", model)
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.2,
        )

    if settings.ANTHROPIC_API_KEY:
        from langchain_anthropic import ChatAnthropic
        model = settings.LANGCHAIN_MODEL or "claude-haiku-4-5-20251001"
        logger.info("LangChain LLM: Anthropic %s", model)
        return ChatAnthropic(model=model, api_key=settings.ANTHROPIC_API_KEY, temperature=0.2)

    if settings.OLLAMA_BASE_URL:
        try:
            from langchain_ollama import ChatOllama
            model = settings.LANGCHAIN_MODEL or settings.OLLAMA_MODEL
            logger.info("LangChain LLM: Ollama %s @ %s", model, settings.OLLAMA_BASE_URL)
            return ChatOllama(model=model, base_url=settings.OLLAMA_BASE_URL, temperature=0.2)
        except ImportError:
            logger.warning("langchain-ollama not installed; skipping Ollama")

    return None


# ---------------------------------------------------------------------------
# Internal backend API caller
# ---------------------------------------------------------------------------

async def _backend(path: str, method: str = "GET", body: dict | None = None) -> dict:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if settings.BACKEND_TOKEN:
        headers["Authorization"] = f"Bearer {settings.BACKEND_TOKEN}"
    url = f"{settings.BACKEND_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            if method == "POST":
                r = await client.post(url, json=body or {}, headers=headers)
            else:
                r = await client.get(url, headers=headers)
        payload = r.json()
        return payload.get("data", payload) if r.status_code == 200 else {"error": f"HTTP {r.status_code}", "detail": payload}
    except Exception as exc:
        logger.error("Backend call failed %s %s: %s", method, path, exc)
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# Tools — each calls a real backend analytics endpoint
# ---------------------------------------------------------------------------

@tool
async def get_dashboard_kpis(_: str = "") -> str:
    """Return current HR dashboard KPIs: total employees, present today, absent today, pending leaves, attendance rate %."""
    data = await _backend("/analytics/dashboard")
    return json.dumps(data, default=str)


@tool
async def get_attendance_trends(month_year: str = "") -> str:
    """Return daily attendance breakdown (present/absent/late counts) for a given month.
    Input format: 'MONTH YEAR' e.g. '5 2026'. Defaults to current month."""
    now = datetime.now()
    parts = month_year.strip().split()
    month = parts[0] if parts else str(now.month)
    year = parts[1] if len(parts) > 1 else str(now.year)
    data = await _backend(f"/analytics/attendance/trends?month={month}&year={year}")
    return json.dumps(data, default=str)


@tool
async def get_department_attendance(month_year: str = "") -> str:
    """Return attendance rate per department for a month.
    Input format: 'MONTH YEAR'. Defaults to current month."""
    now = datetime.now()
    parts = month_year.strip().split()
    month = parts[0] if parts else str(now.month)
    year = parts[1] if len(parts) > 1 else str(now.year)
    data = await _backend(f"/analytics/attendance/department?month={month}&year={year}")
    return json.dumps(data, default=str)


@tool
async def get_leave_summary(year: str = "") -> str:
    """Return leave request counts grouped by status (APPROVED/PENDING/REJECTED) and total days for a year."""
    y = year.strip() or str(datetime.now().year)
    data = await _backend(f"/analytics/leave/summary?year={y}")
    return json.dumps(data, default=str)


@tool
async def get_leave_by_type(year: str = "") -> str:
    """Return approved leave breakdown by type (ANNUAL/SICK/CASUAL/UNPAID) with count and total days."""
    y = year.strip() or str(datetime.now().year)
    data = await _backend(f"/analytics/leave/by-type?year={y}")
    return json.dumps(data, default=str)


@tool
async def get_leave_trends(year: str = "") -> str:
    """Return monthly leave request volume and total days approved throughout the year."""
    y = year.strip() or str(datetime.now().year)
    data = await _backend(f"/analytics/leave/trends?year={y}")
    return json.dumps(data, default=str)


@tool
async def get_workforce_headcount(_: str = "") -> str:
    """Return employee headcount breakdown by role (EMPLOYEE/MANAGER/ADMIN) and active/inactive status."""
    data = await _backend("/analytics/workforce/headcount")
    return json.dumps(data, default=str)


@tool
async def get_turnover_rate(year: str = "") -> str:
    """Return employee turnover rate — count deactivated employees and rate % for the year."""
    y = year.strip() or str(datetime.now().year)
    data = await _backend(f"/analytics/workforce/turnover?year={y}")
    return json.dumps(data, default=str)


@tool
async def get_leave_forecast(department_id: str = "") -> str:
    """Return 30-day leave demand forecast with predicted leave count and risk level (HIGH/MEDIUM/LOW) per day."""
    path = "/predict/leave-forecast"
    if department_id.strip():
        path += f"?departmentId={department_id.strip()}"
    data = await _backend(path)
    return json.dumps(data, default=str)


@tool
async def get_attrition_risk(_: str = "") -> str:
    """Return employee attrition risk analysis with risk scores and contributing risk factors per employee."""
    data = await _backend("/predict/attrition-risk")
    return json.dumps(data, default=str)


@tool
async def get_attendance_anomalies(user_id: str = "") -> str:
    """Detect unusual attendance patterns (frequent late arrivals, Monday absences, early checkouts).
    Optionally pass a userId to scope to one employee."""
    path = "/predict/attendance-anomaly"
    if user_id.strip():
        path += f"?userId={user_id.strip()}"
    data = await _backend(path)
    return json.dumps(data, default=str)


@tool
async def search_hr_policy(query: str) -> str:
    """Search HR policies and system documentation. Use for questions about:
    leave rules, attendance policies, role permissions, system features, workflows."""
    from app.services.rag_service import answer as rag_answer
    result = await rag_answer(query, role="ADMIN")
    return result.get("answer", "No relevant policy information found.")


TOOLS = [
    get_dashboard_kpis,
    get_attendance_trends,
    get_department_attendance,
    get_leave_summary,
    get_leave_by_type,
    get_leave_trends,
    get_workforce_headcount,
    get_turnover_rate,
    get_leave_forecast,
    get_attrition_risk,
    get_attendance_anomalies,
    search_hr_policy,
]

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are WorkNex HR Assistant, an intelligent AI agent for the WorkNex workforce management platform.\n\n"
    "You have real-time access to live HR data through your tools. Follow these rules:\n"
    "1. Always call the relevant tool(s) to get actual data before answering data questions.\n"
    "2. Include specific numbers and percentages from the fetched data in your response.\n"
    "3. Be concise, professional, and proactively flag any concerning trends.\n"
    "4. For policy/rules questions, use search_hr_policy.\n"
    "5. For 'how many', 'what is the rate', 'who is at risk' questions — always fetch real data.\n"
    "6. Format lists and numbers clearly. Avoid generic responses without data.\n\n"
    f"Today's date: {datetime.now().strftime('%Y-%m-%d')}"
)

# ---------------------------------------------------------------------------
# Agent builder (cached per LLM instance)
# ---------------------------------------------------------------------------

_cached_executor: Optional[AgentExecutor] = None
_cached_llm: Optional[BaseChatModel] = None


def _get_executor(llm: BaseChatModel) -> AgentExecutor:
    global _cached_executor, _cached_llm
    if _cached_executor is None or llm is not _cached_llm:
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])
        agent = create_tool_calling_agent(llm, TOOLS, prompt)
        _cached_executor = AgentExecutor(
            agent=agent,
            tools=TOOLS,
            verbose=settings.LANGCHAIN_VERBOSE,
            max_iterations=6,
            handle_parsing_errors=True,
            return_intermediate_steps=False,
        )
        _cached_llm = llm
    return _cached_executor


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def run_agent(message: str, role: str, user_id: str) -> dict[str, Any]:
    """Run the LangChain agent and return a unified chat response dict."""
    llm = build_llm()
    if llm is None:
        return {
            "answer": (
                "LangChain agent is not configured. "
                "Set one of: OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, "
                "or OLLAMA_BASE_URL in the AI service environment."
            ),
            "sources": [],
            "confidence": 0.0,
            "actions": [],
            "fallback": True,
        }

    augmented_input = f"[Role: {role}] {message}"
    executor = _get_executor(llm)
    try:
        result = await executor.ainvoke({"input": augmented_input})
        return {
            "answer": result.get("output", "No response generated."),
            "sources": ["langchain-agent"],
            "confidence": 0.92,
            "actions": [],
            "fallback": False,
        }
    except Exception as exc:
        logger.error("Agent error for user %s: %s", user_id, exc)
        return {
            "answer": "I encountered an error processing your request. Please try rephrasing or check service logs.",
            "sources": [],
            "confidence": 0.0,
            "actions": [],
            "fallback": True,
        }


def is_langchain_ready() -> bool:
    """Return True if at least one LLM provider is configured."""
    return bool(
        settings.OPENAI_API_KEY
        or settings.GEMINI_API_KEY
        or settings.ANTHROPIC_API_KEY
        or settings.OLLAMA_BASE_URL
    )
