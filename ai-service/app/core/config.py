"""Application configuration."""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    APP_NAME: str = "WorkNex AI Service"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Backend connection
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:5000/api/v1")
    BACKEND_TOKEN: str = os.getenv("BACKEND_TOKEN", "")

    # AI Provider (future: openai, gemini, ollama)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "statistical")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
