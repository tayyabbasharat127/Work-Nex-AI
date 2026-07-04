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

    # AI Provider: "statistical" | "langchain"
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "statistical")

    # LLM API key — OpenRouter (gpt-4o-mini) only
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "").strip()
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").strip()
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()

    # LangChain config
    LANGCHAIN_VERBOSE: bool = os.getenv("LANGCHAIN_VERBOSE", "false").lower() == "true"
    LANGCHAIN_MODEL: str = os.getenv("LANGCHAIN_MODEL", "")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()
