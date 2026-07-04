"""Chat controller — handles /chat endpoint."""
from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import detect_intent
from app.services.rag_service import answer

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    role = req.userContext.get("role", "EMPLOYEE")
    intent = detect_intent(req.message)
    response = await answer(req.message, role, req.userContext)
    return ChatResponse(
        message=response["answer"],
        answer=response["answer"],
        intent=intent,
        data={"actions": response.get("actions", [])},
        sources=response.get("sources", []),
        confidence=response.get("confidence", 0),
        actions=response.get("actions", []),
        fallback=response.get("fallback", True),
    )
