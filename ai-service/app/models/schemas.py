"""Pydantic request/response schemas."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ChatRequest(BaseModel):
    userId: str
    userContext: Optional[Dict] = {}
    message: str


class ChatResponse(BaseModel):
    message: str
    intent: Optional[str] = None
    data: Optional[Dict] = None


class ForecastResponse(BaseModel):
    forecast: List[Dict]
    totalPredicted: int
    avgPerDay: float
    riskLevel: str
    algorithm: str
    generatedAt: str


class AnomalyResponse(BaseModel):
    anomalies: List[Dict]
    count: int
    userId: Optional[str]
    analysisDate: str
    algorithm: str
    message: str


class AttritionResponse(BaseModel):
    employees: List[Dict]
    highRiskCount: int
    mediumRiskCount: int
    totalAnalyzed: int
    overallRiskLevel: str
    recommendations: List[str]
    generatedAt: str
    algorithm: str


class AutoApproveRequest(BaseModel):
    leaveType: str
    totalDays: int
    remainingBalance: int
    teamOnLeave: int
    teamSize: int


class AutoApproveResponse(BaseModel):
    decision: str
    score: int
    reasons: List[str]
    recommendation: str
