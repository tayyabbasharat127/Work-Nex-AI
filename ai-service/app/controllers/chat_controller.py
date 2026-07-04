"""Chat controller — routes to LangChain agent (personal + aggregate) or statistical fallback."""
from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import detect_intent, generate_response, is_langchain_mode

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    ctx = req.userContext or {}
    role       = ctx.get("role", "EMPLOYEE")
    user_id    = req.userId or ""
    auth_token = req.authToken or ""
    first_name = ctx.get("firstName", "")
    last_name  = ctx.get("lastName", "")
    user_name  = f"{first_name} {last_name}".strip() or ctx.get("name", "")
    intent     = detect_intent(req.message)

    if is_langchain_mode():
        try:
            from app.services.langchain_agent import run_agent, is_langchain_ready
            if is_langchain_ready():
                response = await run_agent(
                    message=req.message,
                    role=role,
                    user_id=user_id,
                    user_name=user_name,
                    auth_token=auth_token,
                )
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
        except ImportError:
            pass  # langchain not installed — fall through to statistical mode

    # Statistical + RAG fallback
    response = await generate_response(intent, req.message, role, user_id)
    from app.services.rag_service import answer as rag_answer
    rag = await rag_answer(req.message, role=role, user_context=ctx)
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
    from app.services.langchain_agent import is_langchain_ready
    from app.core.config import settings
    lc_ready = is_langchain_mode() and is_langchain_ready()
    provider = "openrouter" if settings.OPENROUTER_API_KEY else "none"
    return {
        "mode": "langchain" if lc_ready else "statistical",
        "langchainReady": lc_ready,
        "llmProvider": provider,
        "backendConnected": bool(settings.BACKEND_TOKEN),
        "personalToolsEnabled": bool(lc_ready),
        "ragBackend": "chromadb-semantic",
    }
