"""Chat controller — handles /chat endpoint."""
from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.chat_service import detect_intent, generate_response

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    role = req.userContext.get("role", "EMPLOYEE")
    intent = detect_intent(req.message)
    response = await generate_response(intent, req.message, role, req.userId)
    return ChatResponse(message=response["text"], intent=intent, data=response.get("data"))
