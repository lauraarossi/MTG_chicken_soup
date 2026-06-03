"""add users table and user_id to decks and conversations

Revision ID: 001
Revises:
Create Date: 2026-06-03

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=True),
        sa.Column("google_id", sa.String(length=100), nullable=True),
        sa.Column("hashed_password", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)

    op.add_column("decks", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_decks_user_id", "decks", "users", ["user_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_decks_user_id", "decks", ["user_id"])

    op.add_column("conversations", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_conversations_user_id", "conversations", "users", ["user_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_conversations_user_id", table_name="conversations")
    op.drop_constraint("fk_conversations_user_id", "conversations", type_="foreignkey")
    op.drop_column("conversations", "user_id")

    op.drop_index("ix_decks_user_id", table_name="decks")
    op.drop_constraint("fk_decks_user_id", "decks", type_="foreignkey")
    op.drop_column("decks", "user_id")

    op.drop_index("ix_users_google_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
