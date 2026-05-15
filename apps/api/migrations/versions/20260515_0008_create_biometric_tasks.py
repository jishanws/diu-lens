"""create biometric tasks

Revision ID: 20260515_0008
Revises: 20260429_0007
Create Date: 2026-05-15 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260515_0008"
down_revision = "20260429_0007"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "biometric_tasks",
        sa.Column("id", sa.BigInteger(), primary_key=True, index=True),
        sa.Column("celery_task_id", sa.String(length=255), unique=True, index=True, nullable=False),
        sa.Column("student_id", sa.String(length=255), index=True, nullable=False),
        sa.Column("task_type", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=50), index=True, nullable=False, server_default="queued"),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("worker_hostname", sa.String(length=255), nullable=True),
        sa.Column("processing_duration_ms", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

def downgrade() -> None:
    op.drop_table("biometric_tasks")
