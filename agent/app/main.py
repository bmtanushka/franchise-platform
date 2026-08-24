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
    try:
        result = await chat.start_chat(tenant_id=body.tenant_id, tenant_name=body.tenant_name, tenant_type=body.tenant_type)
    except ChatTurnError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # noqa: BLE001 - question sets are now admin-editable data,
        # not static Python, so a bad save (a service with no questions, a
        # dangling reference) must degrade to a normal error response for
        # this one visitor, never an unhandled 500 for the whole tenant.
        print(f"[chat] Unhandled error starting chat: {e}")
        raise HTTPException(status_code=500, detail="Sorry, chat isn't available right now. Please try again shortly.")
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
    except Exception as e:  # noqa: BLE001 - see start_chat
        print(f"[chat] Unhandled error handling message: {e}")
        raise HTTPException(status_code=500, detail="Sorry, something went wrong. Please try again shortly.")
    return ChatTurnResponse(**result)
