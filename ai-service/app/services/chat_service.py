"""AI Chat service — routes to LangChain agent or statistical fallback."""
from __future__ import annotations

from typing import Any, Dict

from app.core.config import settings

INTENT_MAP = {
    "leave_balance":  ["leave balance", "how many leaves", "remaining leave", "days left"],
    "leave_apply":    ["apply leave", "request leave", "take leave", "need leave"],
    "attendance":     ["attendance", "check in", "check out", "present", "absent"],
    "performance":    ["performance", "score", "rating", "kpi"],
    "forecast":       ["forecast", "predict", "next month", "upcoming"],
    "team":           ["team", "my team", "employees", "staff"],
    "policy":         ["policy", "rules", "allowed", "maximum"],
    "greeting":       ["hello", "hi", "hey", "good morning", "good afternoon"],
    "help":           ["help", "what can you do", "commands", "features"],
    "attrition":      ["attrition", "risk", "turnover", "resign"],
    "anomaly":        ["anomaly", "pattern", "unusual", "irregular"],
    "powerbi":        ["power bi", "dashboard", "report", "analytics"],
}


def detect_intent(message: str) -> str:
    msg = message.lower()
    for intent, keywords in INTENT_MAP.items():
        if any(kw in msg for kw in keywords):
            return intent
    return "general"


def is_langchain_mode() -> bool:
    return settings.AI_PROVIDER.lower() == "langchain"


async def generate_response(intent: str, message: str, role: str, user_id: str) -> Dict[str, Any]:
    """Statistical fallback response — used when LangChain is not configured."""
    if intent == "greeting":
        return {"text": "Hello! I'm your WorkNex AI assistant. I can help with leave balances, attendance insights, performance analytics, forecasts, and workforce data. What do you need?"}

    if intent == "help":
        return {"text": (
            "Here's what I can help you with:\n\n"
            "📊 Current HR KPIs (attendance rate, headcount)\n"
            "📅 Leave balances and approval status\n"
            "📈 Performance analytics and scoring\n"
            "🔮 30-day leave demand forecasts\n"
            "⚠️ Attrition risk and anomaly detection\n"
            "👥 Department and team analytics (managers)\n"
            "📋 HR policy questions"
        )}

    if intent == "leave_balance":
        return {"text": "Check your leave balance on the **My Leaves** page — remaining days are shown at the top.", "data": {"action": "navigate", "path": "/dashboard/employee/leaves"}}

    if intent == "attendance":
        return {"text": "Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.", "data": {"action": "navigate", "path": "/dashboard/employee/attendance"}}

    if intent == "performance":
        return {"text": "Performance scores are calculated monthly from attendance and leave data. Visit the **Performance** page for your breakdown.", "data": {"action": "navigate", "path": "/dashboard/employee/performance"}}

    if intent == "forecast":
        return {"text": "Leave forecasts are generated from historical patterns. Check the **Forecasts** page for detailed 30-day predictions.", "data": {"action": "navigate", "path": "/dashboard/admin/forecast"}}

    if intent == "attrition":
        return {"text": "Attrition risk is analyzed from attendance, performance, and leave patterns. Go to **Forecast → Attrition Risk** for detailed employee scores.", "data": {"action": "navigate", "path": "/dashboard/admin/forecast"}}

    if intent == "anomaly":
        return {"text": "Attendance anomalies (absence spikes, late patterns) are detected from daily trend data. View them in the **Analytics** section.", "data": {"action": "navigate", "path": "/dashboard/admin/analytics"}}

    if intent == "policy":
        from app.services.rag_service import answer as rag_answer
        result = await rag_answer(message, role=role)
        return {"text": result.get("answer", "Contact HR admin for organization-specific policies."), "sources": result.get("sources", []), "confidence": result.get("confidence", 0)}

    if intent == "team" and role in ("MANAGER", "ADMIN", "SUPER_ADMIN"):
        return {"text": "View your team's attendance, leaves, and performance from the **Team** section.", "data": {"action": "navigate", "path": "/dashboard/manager/team"}}

    if intent == "powerbi":
        return {"text": "Power BI dashboards with workforce analytics are available in the **Power BI** section (admin only).", "data": {"action": "navigate", "path": "/dashboard/admin/powerbi"}}

    return {"text": f"I understand you're asking about: '{message}'. I can help with leave management, attendance tracking, performance analytics, forecasts, and workforce insights. Could you be more specific?"}
