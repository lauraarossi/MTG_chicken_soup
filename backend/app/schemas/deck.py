from datetime import datetime
from pydantic import BaseModel


class DeckCreate(BaseModel):
    name: str
    commander: str
    format: str = "commander"
    description: str | None = None
    decklist: str | None = None


class DeckUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    decklist: str | None = None


class DeckResponse(BaseModel):
    id: int
    name: str
    commander: str
    format: str
    description: str | None
    decklist: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
