"""add enrollment analytics metadata

Revision ID: 20260626_0011
Revises: 20260626_0010
Create Date: 2026-06-26 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260626_0011"
down_revision = "20260626_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("enrollment_images", sa.Column("quality_score", sa.Float(), nullable=True))
    op.add_column("enrollment_images", sa.Column("capture_latency_ms", sa.Integer(), nullable=True))
    op.add_column("enrollment_images", sa.Column("perceptual_hash", sa.String(length=32), nullable=True))
    op.add_column("enrollment_images", sa.Column("duplicate_distance", sa.Integer(), nullable=True))
    op.add_column("enrollment_images", sa.Column("replay_flags", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("enrollment_images", "replay_flags")
    op.drop_column("enrollment_images", "duplicate_distance")
    op.drop_column("enrollment_images", "perceptual_hash")
    op.drop_column("enrollment_images", "capture_latency_ms")
    op.drop_column("enrollment_images", "quality_score")
