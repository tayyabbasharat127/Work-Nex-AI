"""WorkNex AI Service — FastAPI application entry point."""
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.controllers import chat_controller, predict_controller, workflow_controller
from app.core.auth import require_principal

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI & Predictive Analytics service for WorkNex HR platform",
    docs_url="/docs",
    redoc_url="/redoc",
    dependencies=[Depends(require_principal)],
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
def health():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "mode": settings.AI_PROVIDER,
    }
