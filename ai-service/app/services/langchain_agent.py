"""
LangChain Agentic AI — WorkNex HR chatbot with PERSONAL + AGGREGATE tools.

Personal tools (use the asking user's JWT → get THEIR data from DB):
  get_my_leave_balances, get_my_leave_history, get_my_attendance_today,
  get_my_attendance_summary, get_my_performance

Aggregate tools (admin/manager analytics — use service token):
  get_dashboard_kpis, get_attendance_trends, get_department_attendance,
  get_leave_summary, get_leave_by_type, get_leave_trends,
  get_workforce_headcount, get_turnover_rate, get_leave_forecast,
  get_attrition_risk, get_attendance_anomalies, search_hr_policy

How it works:
  Ahmed asks: "How many leaves do I have?"
    → Agent picks get_my_leave_balances
    → Calls GET /leave/balances/me with Ahmed's JWT
    → Returns Ahmed's exact remaining balances
    → GPT-4o-mini formats: "You have 17 Annual, 8 Sick, 10 Casual days remaining."
"""
from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from datetime import datetime
from typing import Any, Optional

import httpx
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Per-request context vars — safely store user identity across async tools
# ---------------------------------------------------------------------------
_user_token: ContextVar[str] = ContextVar("user_token", default="")
_user_id:    ContextVar[str] = ContextVar("user_id",    default="")
_user_name:  ContextVar[str] = ContextVar("user_name",  default="")
_user_role:  ContextVar[str] = ContextVar("user_role",  default="EMPLOYEE")


# ---------------------------------------------------------------------------
# LLM factory — first available provider wins
# ---------------------------------------------------------------------------
def build_llm() -> Optional[BaseChatModel]:
    if settings.OPENROUTER_API_KEY:
        from langchain_openai import ChatOpenAI
        model = settings.LANGCHAIN_MODEL or settings.OPENROUTER_MODEL
        logger.info("LLM: OpenRouter %s", model)
        return ChatOpenAI(
            model=model,
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
            temperature=0.2,
        )
    return None


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------
async def _call(path: str, token: str | None = None, method: str = "GET") -> dict:
    """Make a backend API call. Uses provided token, falls back to service token."""
    auth = token or settings.BACKEND_TOKEN
    headers = {"Content-Type": "application/json"}
    if auth:
        headers["Authorization"] = f"Bearer {auth}"
    url = f"{settings.BACKEND_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(url, headers=headers) if method == "GET" else await client.post(url, headers=headers)
        payload = r.json()
        return payload.get("data", payload) if r.status_code == 200 else {"error": f"HTTP {r.status_code}"}
    except Exception as exc:
        logger.error("API call failed %s: %s", path, exc)
        return {"error": str(exc)}


async def _personal(path: str) -> dict:
    """Call a personal endpoint using the current user's JWT token."""
    return await _call(path, token=_user_token.get() or settings.BACKEND_TOKEN)


async def _service(path: str) -> dict:
    """Call an analytics endpoint using the service token."""
    return await _call(path, token=settings.BACKEND_TOKEN)


# ===========================================================================
# PERSONAL TOOLS — scoped to the user who is asking
# ===========================================================================

@tool
async def get_my_leave_balances(_: str = "") -> str:
    """
    Get the CURRENT USER's remaining leave balances broken down by type
    (Annual, Sick, Casual, Unpaid). Use this when the user asks:
    'How many leaves do I have?', 'What is my leave balance?',
    'How many sick days are left?', 'How much annual leave remaining?'
    Returns their exact remaining days per leave type for the current year.
    """
    data = await _personal("/leave/balances/me")
    return json.dumps(data, default=str)


@tool
async def get_my_leave_history(status_filter: str = "") -> str:
    """
    Get the CURRENT USER's leave request history.
    Shows all leave requests — approved, pending, rejected.
    Optionally filter by status: 'PENDING', 'APPROVED', 'REJECTED'.
    Use when user asks: 'Show my leaves', 'What leaves did I take?',
    'Do I have any pending requests?', 'Was my leave approved?'
    """
    path = "/leave/my"
    if status_filter.strip().upper() in ("PENDING", "APPROVED", "REJECTED"):
        path += f"?status={status_filter.strip().upper()}"
    data = await _personal(path)
    return json.dumps(data, default=str)


@tool
async def get_my_attendance_today(_: str = "") -> str:
    """
    Get the CURRENT USER's attendance record for today.
    Returns check-in time, check-out time, status (PRESENT/LATE/ABSENT), working hours.
    Use when user asks: 'Am I checked in?', 'What time did I check in today?',
    'How many hours have I worked today?', 'What is my status today?'
    """
    data = await _personal("/attendance/today")
    return json.dumps(data, default=str)


@tool
async def get_my_attendance_summary(month_year: str = "") -> str:
    """
    Get the CURRENT USER's attendance summary — present days, late days,
    absent days, working hours for a given month.
    Input format: 'MONTH YEAR' e.g. '6 2026'. Defaults to current month.
    Use when user asks: 'How many times was I late?', 'How many absences do I have?',
    'Show my attendance for this month', 'What is my attendance rate?'
    """
    now = datetime.now()
    parts = month_year.strip().split()
    month = parts[0] if parts else str(now.month)
    year  = parts[1] if len(parts) > 1 else str(now.year)
    data = await _personal(f"/attendance/my?month={month}&year={year}&limit=100")
    return json.dumps(data, default=str)


@tool
async def get_my_performance(_: str = "") -> str:
    """
    Get the CURRENT USER's performance records — monthly scores, attendance score,
    leave score, punctuality score, overall performance score.
    Use when user asks: 'What is my performance score?', 'How am I doing?',
    'Show my KPIs', 'What is my rating this month?', 'Am I performing well?'
    """
    data = await _personal(f"/performance/me?year={datetime.now().year}")
    return json.dumps(data, default=str)


# ===========================================================================
# AGGREGATE TOOLS — org/team-level analytics (service token)
# ===========================================================================

@tool
async def get_dashboard_kpis(_: str = "") -> str:
    """Return org-wide HR KPIs: total employees, present today, absent today,
    pending leaves, attendance rate %. Use for admin/manager overviews."""
    return json.dumps(await _service("/analytics/dashboard"), default=str)


@tool
async def get_attendance_trends(month_year: str = "") -> str:
    """Return daily attendance counts (present/absent/late) for a month.
    Format: 'MONTH YEAR'. Use for trend analysis, charts."""
    now = datetime.now()
    parts = month_year.strip().split()
    m = parts[0] if parts else str(now.month)
    y = parts[1] if len(parts) > 1 else str(now.year)
    return json.dumps(await _service(f"/analytics/attendance/trends?month={m}&year={y}"), default=str)


@tool
async def get_department_attendance(month_year: str = "") -> str:
    """Return attendance rate per department. Format: 'MONTH YEAR'."""
    now = datetime.now()
    parts = month_year.strip().split()
    m = parts[0] if parts else str(now.month)
    y = parts[1] if len(parts) > 1 else str(now.year)
    return json.dumps(await _service(f"/analytics/attendance/department?month={m}&year={y}"), default=str)


@tool
async def get_leave_summary(year: str = "") -> str:
    """Return leave request counts by status (APPROVED/PENDING/REJECTED) for a year."""
    y = year.strip() or str(datetime.now().year)
    return json.dumps(await _service(f"/analytics/leave/summary?year={y}"), default=str)


@tool
async def get_leave_by_type(year: str = "") -> str:
    """Return approved leave breakdown by type (ANNUAL/SICK/CASUAL/UNPAID)."""
    y = year.strip() or str(datetime.now().year)
    return json.dumps(await _service(f"/analytics/leave/by-type?year={y}"), default=str)


@tool
async def get_leave_trends(year: str = "") -> str:
    """Return monthly leave volume and days approved throughout the year."""
    y = year.strip() or str(datetime.now().year)
    return json.dumps(await _service(f"/analytics/leave/trends?year={y}"), default=str)


@tool
async def get_workforce_headcount(_: str = "") -> str:
    """Return employee headcount by role and active/inactive status."""
    return json.dumps(await _service("/analytics/workforce/headcount"), default=str)


@tool
async def get_turnover_rate(year: str = "") -> str:
    """Return employee turnover rate for a year."""
    y = year.strip() or str(datetime.now().year)
    return json.dumps(await _service(f"/analytics/workforce/turnover?year={y}"), default=str)


@tool
async def get_leave_forecast(department_id: str = "") -> str:
    """Return 30-day ML leave demand forecast with risk levels."""
    path = "/predict/leave-forecast"
    if department_id.strip():
        path += f"?departmentId={department_id.strip()}"
    return json.dumps(await _service(path), default=str)


@tool
async def get_attrition_risk(_: str = "") -> str:
    """Return employee attrition risk scores and contributing factors."""
    return json.dumps(await _service("/predict/attrition-risk"), default=str)


@tool
async def get_attendance_anomalies(user_id: str = "") -> str:
    """Detect unusual attendance patterns. Optionally pass userId to scope to one employee."""
    path = "/predict/attendance-anomaly"
    if user_id.strip():
        path += f"?userId={user_id.strip()}"
    return json.dumps(await _service(path), default=str)


@tool
async def search_hr_policy(query: str) -> str:
    """Search HR policies and system documentation using semantic search.
    Use for questions about leave rules, attendance policies, role permissions, workflows."""
    from app.services.rag_service import answer as rag_answer
    result = await rag_answer(query, role=_user_role.get())
    return result.get("answer", "No relevant policy found.")


# ---------------------------------------------------------------------------
# Tool registry — personal tools listed first so LLM prefers them for
# questions about "my" data
# ---------------------------------------------------------------------------
TOOLS = [
    # Personal (user-scoped) — highest priority for self-service questions
    get_my_leave_balances,
    get_my_leave_history,
    get_my_attendance_today,
    get_my_attendance_summary,
    get_my_performance,
    # Aggregate (org-wide analytics)
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
# System prompt — user-aware, role-aware
# ---------------------------------------------------------------------------
SYSTEM_PROMPT = """\
You are WorkNex HR Assistant — an intelligent AI agent for the WorkNex workforce platform.

Current user: {user_name} | Role: {user_role}
Today: {today}

IMPORTANT RULES:
1. When the user asks about THEIR OWN data (leaves, attendance, performance, score):
   → ALWAYS use the get_my_* personal tools — they return that specific user's data.
2. When the user is a MANAGER or ADMIN asking about the TEAM or ORG:
   → Use the aggregate analytics tools.
3. Always include EXACT numbers from the data. Never say "check the dashboard".
4. Be concise and friendly. Address the user by first name.
5. For policy questions → use search_hr_policy.
6. If a tool returns an error, say so clearly and suggest the user check with HR admin.
"""

# ---------------------------------------------------------------------------
# Agent cache (one per LLM instance) — uses LangGraph create_react_agent
# ---------------------------------------------------------------------------
_cached_agent: Any = None
_cached_llm: Optional[BaseChatModel] = None


def _get_agent(llm: BaseChatModel) -> Any:
    global _cached_agent, _cached_llm
    if _cached_agent is None or llm is not _cached_llm:
        _cached_agent = create_react_agent(llm, TOOLS)
        _cached_llm = llm
    return _cached_agent


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
async def run_agent(
    message: str,
    role: str,
    user_id: str,
    user_name: str = "",
    auth_token: str = "",
) -> dict[str, Any]:
    """
    Run the LangChain agent for a specific user.
    auth_token: the user's JWT — enables personal DB queries.
    """
    llm = build_llm()
    if llm is None:
        return {
            "answer": (
                "LangChain agent not configured. "
                "Set OPENROUTER_API_KEY in ai-service/.env"
            ),
            "sources": [], "confidence": 0.0, "actions": [], "fallback": True,
        }

    # Store user identity in per-request context vars (thread-safe for async)
    _user_token.set(auth_token)
    _user_id.set(user_id)
    _user_name.set(user_name or "there")
    _user_role.set(role)

    # Build the user-aware system prompt for this request
    system_msg = SYSTEM_PROMPT.format(
        user_name=user_name or "User",
        user_role=role,
        today=datetime.now().strftime("%Y-%m-%d"),
    )

    agent = _get_agent(llm)
    try:
        result = await agent.ainvoke({
            "messages": [
                ("system", system_msg),
                ("human", message),
            ]
        })
        # LangGraph returns messages list — last message is the AI answer
        output = result["messages"][-1].content if result.get("messages") else "No response."
        return {
            "answer": output,
            "sources": ["langchain-agent"],
            "confidence": 0.92,
            "actions": [],
            "fallback": False,
        }
    except Exception as exc:
        logger.error("Agent error for user %s: %s", user_id, exc)
        return {
            "answer": "Sorry, I encountered an error. Please try again or rephrase your question.",
            "sources": [], "confidence": 0.0, "actions": [], "fallback": True,
        }


def is_langchain_ready() -> bool:
    return bool(settings.OPENROUTER_API_KEY)
