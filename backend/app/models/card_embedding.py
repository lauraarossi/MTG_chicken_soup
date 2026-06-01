from pgvector.sqlalchemy import Vector
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

# Dimension matches nomic-embed-text (768). Changing embedding models requires
# dropping and recreating this table.
EMBEDDING_DIM = 768


class CardEmbedding(Base):
    __tablename__ = "card_embeddings"

    card_name: Mapped[str] = mapped_column(String(200), primary_key=True)
    card_text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM))
