from fastapi import FastAPI, HTTPException

from . import chat
from .chat import ChatTurnError
from .schemas import ChatMessageRequest, ChatTurnResponse, StartChatRequest

app = FastAPI(title="Franchise Platform Agent")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat/start", response_model=ChatTurnResponse)
async def start_chat(body: StartChatRequest) -> ChatTurnResponse:
    result = await chat.start_chat(tenant_id=body.tenant_id, tenant_name=body.tenant_name, tenant_type=body.tenant_type)
    return ChatTurnResponse(**result)


@app.post("/chat/message", response_model=ChatTurnResponse)
async def send_message(body: ChatMessageRequest) -> ChatTurnResponse:
    try:
        result = await chat.handle_message(
            session_id=body.session_id,
            tenant_name=body.tenant_name,
            user_message=body.message,
        )
    except ChatTurnError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ChatTurnResponse(**result)
