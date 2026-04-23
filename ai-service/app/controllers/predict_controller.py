"""Predict controller — handles /predict/* endpoints."""
from fastapi import APIRouter
from typing import Optional
from app.services.forecast_service import generate_leave_forecast
from app.services.anomaly_service import detect_anomalies
from app.services.attrition_service import calculate_attrition_risk

router = APIRouter(prefix="/predict", tags=["Predictions"])


@router.get("/leave-forecast")
async def leave_forecast(departmentId: Optional[str] = None):
    return await generate_leave_forecast(departmentId)


@router.get("/attendance-anomaly")
async def attendance_anomaly(userId: Optional[str] = None):
    return await detect_anomalies(userId)


@router.get("/attrition-risk")
async def attrition_risk():
    return await calculate_attrition_risk()
