from datetime import datetime
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    conversation_id: int | None = None
    deck_id: int | None = None
    system_context: str | None = None  # extra context injected into the system prompt


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


class ExtractDeckRequest(BaseModel):
    conversation_id: int


class ExtractDeckResponse(BaseModel):
    decklist: str
