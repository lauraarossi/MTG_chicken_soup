import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.database import get_db
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ChatRequest, ConversationResponse
from app.ml.inference import get_response
from app.ml.rag import get_relevant_cards

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=ConversationResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    try:
        if request.conversation_id:
            result = await db.execute(
                select(Conversation)
                .where(Conversation.id == request.conversation_id)
                .options(selectinload(Conversation.messages))
            )
            conversation = result.scalar_one_or_none()
            prior_messages = list(conversation.messages)
        else:
            conversation = Conversation(deck_id=request.deck_id)
            db.add(conversation)
            await db.flush()
            prior_messages = []

        user_msg = Message(
            conversation_id=conversation.id,
            role="user",
            content=request.message,
        )
        db.add(user_msg)

        history = [{"role": m.role, "content": m.content} for m in prior_messages + [user_msg]]
        try:
            context = await get_relevant_cards(request.message, db)
        except Exception:
            context = None
        response_text = await get_response(request.message, history, context=context)

        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_text,
        )
        db.add(assistant_msg)

        await db.commit()

        result = await db.execute(
            select(Conversation)
            .where(Conversation.id == conversation.id)
            .options(selectinload(Conversation.messages))
        )
        return result.scalar_one()
    except Exception as e:
        logger.exception("Unhandled error in chat endpoint")
        raise HTTPException(status_code=500, detail=str(e))
