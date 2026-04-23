"""Workflow controller — agentic leave auto-approval."""
from fastapi import APIRouter
from app.models.schemas import AutoApproveRequest, AutoApproveResponse

router = APIRouter(prefix="/workflow", tags=["Workflow"])


@router.post("/auto-approve", response_model=AutoApproveResponse)
async def auto_approve(data: AutoApproveRequest) -> AutoApproveResponse:
    reasons = []
    score = 0

    # Rule 1: Sufficient balance
    if data.remainingBalance >= data.totalDays:
        score += 30
    else:
        reasons.append("Insufficient leave balance")

    # Rule 2: Leave type + duration
    if data.leaveType == "SICK" and data.totalDays <= 2:
        score += 40
    elif data.leaveType in ["CASUAL", "ANNUAL"] and data.totalDays <= 3:
        score += 20

    # Rule 3: Team coverage (≥70% present)
    coverage = (data.teamSize - data.teamOnLeave) / max(data.teamSize, 1)
    if coverage >= 0.7:
        score += 30
    else:
        reasons.append("Team coverage below 70%")

    decision = "AUTO_APPROVE" if score >= 70 and not reasons else "ROUTE_TO_MANAGER"

    return AutoApproveResponse(
        decision=decision,
        score=score,
        reasons=reasons,
        recommendation="Auto-approved by AI" if decision == "AUTO_APPROVE" else f"Requires manager review: {', '.join(reasons)}"
    )
