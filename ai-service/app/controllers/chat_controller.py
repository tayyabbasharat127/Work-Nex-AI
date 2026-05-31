"""Chat controller — LangChain agent or statistical fallback."""
from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import detect_intent, generate_response, is_langchain_mode

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    role = req.userContext.get("role", "EMPLOYEE") if req.userContext else "EMPLOYEE"
    user_id = req.userId or ""
    intent = detect_intent(req.message)

    if is_langchain_mode():
        from app.services.langchain_agent import run_agent, is_langchain_ready
        if is_langchain_ready():
            response = await run_agent(req.message, role, user_id)
            return ChatResponse(
                message=response["answer"],
                answer=response["answer"],
                intent=intent,
                data={"mode": "langchain", "actions": response.get("actions", [])},
                sources=response.get("sources", []),
                confidence=response.get("confidence", 0.92),
                actions=response.get("actions", []),
                fallback=response.get("fallback", False),
            )

    # Statistical / RAG fallback
    response = await generate_response(intent, req.message, role, user_id)
    from app.services.rag_service import answer as rag_answer
    rag = await rag_answer(req.message, role=role, user_context=req.userContext)

    answer_text = response.get("text", rag.get("answer", ""))
    return ChatResponse(
        message=answer_text,
        answer=answer_text,
        intent=intent,
        data={"mode": "statistical", "actions": rag.get("actions", [])},
        sources=rag.get("sources", []),
        confidence=rag.get("confidence", 0.5),
        actions=rag.get("actions", []),
        fallback=True,
    )


@router.get("/status", tags=["Chat"])
async def chat_status():
    """Return current AI provider mode and readiness."""
    from app.services.langchain_agent import is_langchain_ready, build_llm
    from app.core.config import settings
    lc_ready = is_langchain_mode() and is_langchain_ready()
    llm_provider = "none"
    if settings.OPENAI_API_KEY:
        llm_provider = "openai"
    elif settings.GEMINI_API_KEY:
        llm_provider = "gemini"
    elif settings.ANTHROPIC_API_KEY:
        llm_provider = "anthropic"
    elif settings.OLLAMA_BASE_URL:
        llm_provider = "ollama"

    return {
        "mode": "langchain" if lc_ready else "statistical",
        "langchainReady": lc_ready,
        "llmProvider": llm_provider,
        "backendConnected": bool(settings.BACKEND_TOKEN),
        "ragBackend": "chromadb-semantic",
    }
