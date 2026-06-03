import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.database import get_db
from app.models.conversation import Conversation, Message
from app.models.user import User
from app.schemas.conversation import ChatRequest, ConversationResponse, ExtractDeckRequest, ExtractDeckResponse
from app.ml.inference import get_response
from app.ml.rag import get_relevant_cards, lookup_cards_in_query
from app.security import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

EXTRACT_PROMPT = (
    "Based on our conversation, extract the complete deck list that was recommended. "
    "Format it as plain text, one card per line using the format: '1 Card Name'. "
    "Group cards under section headers prefixed with //. "
    "For Commander/Brawl format decks, list the commander(s) first under '// Commander' — include both cards if it is a partner deck (this is a deck zone designation, not a card type). "
    "Then group the remaining cards by their primary card type using only these headers "
    "(include a section only if it has cards): "
    "// Creature, // Planeswalker, // Battle, // Instant, // Sorcery, // Artifact, // Enchantment, // Land, // Other. "
    "Put Conspiracy, Dungeon, Phenomenon, Plane, Scheme, Vanguard, and any other unusual types under // Other. "
    "Do not create a Tribal section — tribal cards go under their other type. "
    "Return ONLY the formatted decklist — no introduction, no explanation, no closing remarks. "
    "If no complete deck was discussed, return an empty string."
)


@router.post("", response_model=ConversationResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
            conversation = Conversation(deck_id=request.deck_id, user_id=current_user.id)
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
            card_context = await lookup_cards_in_query(request.message)
        except Exception:
            card_context = None
        try:
            vector_context = await get_relevant_cards(request.message, db)
        except Exception:
            vector_context = None
        context_parts = [p for p in [request.system_context, card_context, vector_context] if p]
        context = "\n\n".join(context_parts) or None
        response_text = await get_response(request.message, history, context=context)

        assistant_msg = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_text,
        )
        db.add(assistant_msg)

        await db.commit()
        await db.refresh(conversation, attribute_names=["messages"])
        return conversation
    except Exception as e:
        logger.exception("Unhandled error in chat endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-deck", response_model=ExtractDeckResponse)
async def extract_deck(
    request: ExtractDeckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
