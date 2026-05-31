from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.deck import Deck
from app.schemas.deck import DeckCreate, DeckUpdate, DeckResponse

router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("/", response_model=list[DeckResponse])
async def list_decks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Deck).order_by(Deck.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=DeckResponse, status_code=201)
async def create_deck(deck: DeckCreate, db: AsyncSession = Depends(get_db)):
    db_deck = Deck(**deck.model_dump())
    db.add(db_deck)
    await db.commit()
    await db.refresh(db_deck)
    return db_deck


@router.get("/{deck_id}", response_model=DeckResponse)
async def get_deck(deck_id: int, db: AsyncSession = Depends(get_db)):
    deck = await db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.patch("/{deck_id}", response_model=DeckResponse)
async def update_deck(deck_id: int, update: DeckUpdate, db: AsyncSession = Depends(get_db)):
    deck = await db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    for field, value in update.model_dump(exclude_none=True).items():
        setattr(deck, field, value)
    await db.commit()
    await db.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=204)
async def delete_deck(deck_id: int, db: AsyncSession = Depends(get_db)):
    deck = await db.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    await db.delete(deck)
    await db.commit()
