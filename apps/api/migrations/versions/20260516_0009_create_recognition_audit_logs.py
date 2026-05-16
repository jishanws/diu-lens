"""create recognition audit logs

Revision ID: 20260516_0009
Revises: 20260515_0008
Create Date: 2026-05-16 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260516_0009"
down_revision = "20260515_0008"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "recognition_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("request_id", sa.String(length=128), nullable=False, index=True),
        sa.Column("searched_by_admin_id", sa.Integer(), sa.ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("searched_student_id", sa.String(length=64), nullable=True, index=True),
        sa.Column("top_match_student_id", sa.String(length=64), nullable=True, index=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("cosine_distance", sa.Float(), nullable=True),
        sa.Column("threshold_used", sa.Float(), nullable=True),
        sa.Column("accepted_match", sa.Boolean(), nullable=False, server_default=sa.text("false"), index=True),
        sa.Column("top_k_results_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("image_metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("processing_duration_ms", sa.Float(), nullable=True),
        sa.Column("recognition_model_version", sa.String(length=64), nullable=False, server_default="'v1'"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), index=True),
    )

def downgrade() -> None:
    op.drop_table("recognition_audit_logs")
