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

    # LLM API keys — first non-empty one wins in langchain_agent
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    # Ollama (local, free)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")

    # LangChain config
    LANGCHAIN_VERBOSE: bool = os.getenv("LANGCHAIN_VERBOSE", "false").lower() == "true"
    LANGCHAIN_MODEL: str = os.getenv("LANGCHAIN_MODEL", "")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()
