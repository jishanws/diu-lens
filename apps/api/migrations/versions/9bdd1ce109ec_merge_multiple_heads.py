"""merge multiple heads

Revision ID: 9bdd1ce109ec
Revises: 20260626_0011, 6230b6ae8610
Create Date: 2026-06-27 21:48:46.912346

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9bdd1ce109ec'
down_revision = ('20260626_0011', '6230b6ae8610')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
