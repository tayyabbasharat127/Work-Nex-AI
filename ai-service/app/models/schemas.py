"""Pydantic request/response schemas."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class _LegacyChatRequestRemoved(BaseModel):
    message: str
    authToken: Optional[str] = None   # user's JWT — enables personal DB queries


class ChatRequest(BaseModel):
    message: str

    class Config:
        extra = "forbid"


class ChatResponse(BaseModel):
    message: str
    answer: Optional[str] = None
    intent: Optional[str] = None
    data: Optional[Dict] = None
    sources: List[str] = []
    confidence: float = 0
    actions: List[Dict[str, Any]] = []
    fallback: bool = True


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


class PerformancePredictionRequest(BaseModel):
    employeeId: str
    features: Dict[str, Any]


class PerformancePredictionResponse(BaseModel):
    employeeId: str
    predictedScore: float
    riskLevel: str
    confidence: float
    reasons: List[str]
    featuresUsed: Dict[str, Any]
    modelVersion: str
    fallback: bool = False
    advisoryOnly: bool = True
    humanReviewRequired: bool = True
    disclaimer: str = "Advisory model output only. Human review is required before employment action."


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
    humanReviewRequired: bool = True
