"""add tsvector search column to card_embeddings

Revision ID: 003
Revises: 002
Create Date: 2026-06-09

"""
from typing import Sequence, Union
from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE card_embeddings
        ADD COLUMN IF NOT EXISTS search_vec tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce(card_name, '')), 'A') ||
            setweight(to_tsvector('english', coalesce(card_text,  '')), 'B')
        ) STORED
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_card_embeddings_search_vec
        ON card_embeddings USING GIN (search_vec)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_card_embeddings_search_vec")
    op.execute("ALTER TABLE card_embeddings DROP COLUMN IF EXISTS search_vec")
