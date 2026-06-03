from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.deck import Deck
from app.models.user import User
from app.schemas.deck import DeckCreate, DeckUpdate, DeckResponse
from app.security import get_current_user

router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("", response_model=list[DeckResponse])
async def list_decks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Deck).where(Deck.user_id == current_user.id).order_by(Deck.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=DeckResponse, status_code=201)
async def create_deck(
    deck: DeckCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_deck = Deck(**deck.model_dump(), user_id=current_user.id)
    db.add(db_deck)
    await db.commit()
    await db.refresh(db_deck)
    return db_deck


@router.get("/{deck_id}", response_model=DeckResponse)
async def get_deck(
    deck_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = await db.get(Deck, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.patch("/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: int,
    update: DeckUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = await db.get(Deck, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deck not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(deck, field, value)
    await db.commit()
    await db.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=204)
async def delete_deck(
    deck_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deck = await db.get(Deck, deck_id)
    if not deck or deck.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Deck not found")
    await db.delete(deck)
    await db.commit()
