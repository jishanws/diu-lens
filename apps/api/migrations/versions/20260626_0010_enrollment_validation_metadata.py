"""add strict enrollment validation metadata

Revision ID: 20260626_0010
Revises: 20260429_0007
Create Date: 2026-06-26 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260626_0010"
down_revision = "20260429_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("enrollment_images", sa.Column("image_index", sa.Integer(), nullable=True))
    op.add_column(
        "enrollment_images",
        sa.Column("validation_status", sa.String(length=32), nullable=False, server_default="accepted"),
    )
    op.add_column("enrollment_images", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.add_column("enrollment_images", sa.Column("face_box", sa.Text(), nullable=True))
    op.add_column("enrollment_images", sa.Column("yaw", sa.Float(), nullable=True))
    op.add_column("enrollment_images", sa.Column("pitch", sa.Float(), nullable=True))
    op.add_column("enrollment_images", sa.Column("roll", sa.Float(), nullable=True))
    op.alter_column("enrollment_images", "validation_status", server_default=None)


def downgrade() -> None:
    op.drop_column("enrollment_images", "roll")
    op.drop_column("enrollment_images", "pitch")
    op.drop_column("enrollment_images", "yaw")
    op.drop_column("enrollment_images", "face_box")
    op.drop_column("enrollment_images", "rejection_reason")
    op.drop_column("enrollment_images", "validation_status")
    op.drop_column("enrollment_images", "image_index")
