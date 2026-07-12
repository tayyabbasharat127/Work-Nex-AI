"""Predict + Detect controller — /predict/* and /detect/* endpoints."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends
from app.core.auth import AuthenticatedPrincipal, require_principal
from pydantic import BaseModel

from app.models.schemas import (
    AnomalyResponse,
    AttritionResponse,
    PerformancePredictionRequest,
    PerformancePredictionResponse,
)
from app.services.anomaly_service import detect_anomalies
from app.services.attrition_service import calculate_attrition_risk, score_single_employee
from app.services.forecast_service import generate_leave_forecast
from app.services.leave_policy_service import extract_leave_policy
from app.services.prediction_service import predict_performance

router = APIRouter(tags=["Predictions"])


# ─── Leave forecast ────────────────────────────────────────────────────────────

@router.get("/predict/leave-forecast")
async def leave_forecast(departmentId: Optional[str] = None):
    return await generate_leave_forecast(departmentId)


# ─── Anomaly detection (GET = user-scope, POST = org-scope for alerts) ─────────

@router.get("/predict/attendance-anomaly")
async def attendance_anomaly_get(userId: Optional[str] = None):
    return await detect_anomalies(userId)


class AnomalyScanRequest(BaseModel):
    organizationId: str
    date: Optional[str] = None


@router.post("/detect/anomalies")
async def detect_anomalies_post(req: AnomalyScanRequest):
    """Called by the backend alerts service for org-wide real-time scanning."""
    result = await detect_anomalies(userId=None, organizationId=req.organizationId, date=req.date)
    return result


# ─── Attrition risk (GET = all employees, POST = single employee from ETL) ─────

@router.get("/predict/attrition-risk")
async def attrition_risk_get():
    result = await calculate_attrition_risk()
    result.update({"advisoryOnly": True, "humanReviewRequired": True, "disclaimer": "Advisory model output only. Human review is required before employment action."})
    return result


class AttritionSingleRequest(BaseModel):
    employeeId: str
    performanceRecord: Dict[str, Any]


class AttritionSingleResponse(BaseModel):
    employeeId: str
    riskScore: float
    riskLabel: str
    willLeaveProb: float
    factors: List[str]
    modelVersion: str
    source: str
    advisoryOnly: bool = True
    humanReviewRequired: bool = True
    disclaimer: str = "Advisory model output only. Human review is required before employment action."


@router.post("/predict/attrition", response_model=AttritionSingleResponse)
async def attrition_single(req: AttritionSingleRequest):
    """Called by the backend attrition ETL for per-user ML inference."""
    result = await score_single_employee(req.employeeId, req.performanceRecord)
    return AttritionSingleResponse(**result)


# ─── Performance prediction ────────────────────────────────────────────────────

@router.post("/predict/performance", response_model=PerformancePredictionResponse)
async def performance_prediction(req: PerformancePredictionRequest) -> PerformancePredictionResponse:
    return PerformancePredictionResponse(**predict_performance(req.employeeId, req.features))


# ─── Leave policy extractor ────────────────────────────────────────────────────

class LeavePolicyRequest(BaseModel):
    text: str


@router.post("/predict/leave-policy")
async def leave_policy(req: LeavePolicyRequest, principal: AuthenticatedPrincipal = Depends(require_principal)):
    """Extract structured leave policy from free-text (HR docs, emails, PDFs)."""
    return await extract_leave_policy(req.text, principal.organization_id)
