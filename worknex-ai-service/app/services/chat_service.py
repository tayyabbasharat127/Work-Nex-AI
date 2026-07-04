"""AI Chat service — intent detection + response generation."""
from typing import Dict


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
}


def detect_intent(message: str) -> str:
    msg = message.lower()
    for intent, keywords in INTENT_MAP.items():
        if any(kw in msg for kw in keywords):
            return intent
    return "general"


async def generate_response(intent: str, message: str, role: str, user_id: str) -> Dict:
    if intent == "greeting":
        return {"text": "Hello! I'm your WorkNex AI assistant. I can help with leave balances, attendance insights, performance analytics, and workforce forecasts. What do you need?"}

    if intent == "help":
        return {"text": "Here's what I can help you with:\n\n📊 Check leave balances\n📅 Attendance insights\n📈 Performance analytics\n🔮 Leave demand forecasts\n⚠️ Attrition risk analysis\n👥 Team overview (managers)"}

    if intent == "leave_balance":
        return {"text": "Check your leave balance on the **My Leaves** page — remaining days are shown at the top.", "data": {"action": "navigate", "path": "/dashboard/employee/leaves"}}

    if intent == "attendance":
        return {"text": "Your attendance history is on the **Attendance** page — check-in times, working hours, and monthly records.", "data": {"action": "navigate", "path": "/dashboard/employee/attendance"}}

    if intent == "performance":
        return {"text": "Performance scores are calculated monthly from attendance and leave data. Visit the **Performance** page for your breakdown.", "data": {"action": "navigate", "path": "/dashboard/employee/performance"}}

    if intent == "forecast":
        return {"text": "Leave forecasts are generated from historical patterns. Check the **Forecasts** page for detailed predictions.", "data": {"action": "navigate", "path": "/dashboard/admin/forecast"}}

    if intent == "policy":
        return {"text": "Standard leave policies:\n• Annual Leave: 20 days/year\n• Sick Leave: 10 days/year\n• Casual Leave: 10 days/year\n\nContact HR admin for organization-specific policies."}

    if intent == "team" and role in ["MANAGER", "ADMIN", "SUPER_ADMIN"]:
        return {"text": "View your team's attendance, leaves, and performance from the **Team** section.", "data": {"action": "navigate", "path": "/dashboard/manager/team"}}

    return {"text": f"I understand you're asking about: '{message}'. I can help with leave management, attendance tracking, performance analytics, and workforce insights. Could you be more specific?"}
