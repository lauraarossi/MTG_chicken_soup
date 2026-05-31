from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.database import get_db
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ChatRequest, ConversationResponse
from app.ml.inference import get_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/", response_model=ConversationResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    if request.conversation_id:
        result = await db.execute(
            select(Conversation)
            .where(Conversation.id == request.conversation_id)
            .options(selectinload(Conversation.messages))
        )
        conversation = result.scalar_one_or_none()
    else:
        conversation = Conversation(deck_id=request.deck_id)
        db.add(conversation)
        await db.flush()
        conversation.messages = []

    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message,
    )
    db.add(user_msg)
    conversation.messages.append(user_msg)

    history = [{"role": m.role, "content": m.content} for m in conversation.messages]
    response_text = await get_response(request.message, history)

    assistant_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=response_text,
    )
    db.add(assistant_msg)
    conversation.messages.append(assistant_msg)

    await db.commit()
    await db.refresh(conversation)
    return conversation
