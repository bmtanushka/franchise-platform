from typing import Optional

from pydantic import BaseModel


class StartChatRequest(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_type: str


class ChatMessageRequest(BaseModel):
    session_id: str
    tenant_name: str
    message: str


class ChatTurnResponse(BaseModel):
    session_id: str
    reply: str
    done: bool = False
    lead_id: Optional[str] = None
