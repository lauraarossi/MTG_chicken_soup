from datetime import datetime
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None
    deck_id: int | None = None


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: int
    deck_id: int | None
    messages: list[MessageResponse]
    created_at: datetime

    model_config = {"from_attributes": True}
