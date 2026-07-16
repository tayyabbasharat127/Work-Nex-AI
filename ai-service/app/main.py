"""WorkNex AI Service — FastAPI application entry point."""
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.controllers import chat_controller, predict_controller, workflow_controller
from app.core.auth import AuthenticatedPrincipal, require_principal

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI & Predictive Analytics service for WorkNex HR platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat_controller.router)
app.include_router(predict_controller.router)
app.include_router(workflow_controller.router)


@app.get("/health", tags=["Health"])
@app.get("/health/live", tags=["Health"])
def liveness():
    """Public process liveness with no provider or model detail."""
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
    }


def _model_inventory() -> dict[str, bool]:
    models = Path(__file__).resolve().parents[1] / "models"
    required = {
        "performance": "performance_model.pkl",
        "leaveForecast": "leave_forecast_model.pkl",
        "attritionClassifier": "attrition_classifier.pkl",
        "attritionRegressor": "attrition_regressor.pkl",
        "anomaly": "anomaly_model.pkl",
    }
    return {name: (models / filename).is_file() for name, filename in required.items()}


@app.get("/health/ready", tags=["Health"])
def readiness(_: AuthenticatedPrincipal = Depends(require_principal)):
    """Authenticated dependency readiness without sensitive configuration."""
    models = _model_inventory()
    knowledge_dir = Path(__file__).resolve().parents[1] / "knowledge"
    checks = {
        "jwtVerification": bool(settings.JWT_SECRET),
        "backendConfigured": bool(settings.BACKEND_URL),
        "modelsAvailable": all(models.values()),
        "knowledgeAvailable": knowledge_dir.is_dir() and any(knowledge_dir.glob("*.md")),
    }
    if not all(checks.values()):
        raise HTTPException(status_code=503, detail={"status": "not_ready", "checks": checks})
    return {"status": "ready", "checks": checks}


@app.get("/health/models", tags=["Health"])
def model_health(_: AuthenticatedPrincipal = Depends(require_principal)):
    """Authenticated inventory that never returns keys, paths, or credentials."""
    models = _model_inventory()
    return {
        "status": "ready" if all(models.values()) else "degraded",
        "providerMode": settings.AI_PROVIDER,
        "models": models,
    }
