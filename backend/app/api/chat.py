import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.database import get_db
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ChatRequest, ConversationResponse, ExtractDeckRequest, ExtractDeckResponse
from app.ml.inference import get_response
from app.ml.rag import get_relevant_cards

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

EXTRACT_PROMPT = (
    "Based on our conversation, extract the complete deck list that was recommended. "
    "Format it as plain text, one card per line using the format: '1 Card Name'. "
    "Group cards under section headers prefixed with // using the card's primary type. "
    "Use these section headers (only include sections that have cards): "
    "// Commander, // Planeswalker, // Battle, // Creature, // Instant, // Sorcery, "
    "// Artifact, // Enchantment, // Land. "
    "Do not use a 'Tribal' section — tribal cards should appear under their other type. "
    "Return ONLY the formatted decklist — no introduction, no explanation, no closing remarks. "
    "If no complete deck was discussed, return an empty string."
)


@router.post("", response_model=ConversationResponse)
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


@router.post("/extract-deck", response_model=ExtractDeckResponse)
async def extract_deck(request: ExtractDeckRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == request.conversation_id)
        .options(selectinload(Conversation.messages))
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    history = [{"role": m.role, "content": m.content} for m in conversation.messages]
    history.append({"role": "user", "content": EXTRACT_PROMPT})

    decklist = await get_response(EXTRACT_PROMPT, history)
    return {"decklist": decklist.strip()}
