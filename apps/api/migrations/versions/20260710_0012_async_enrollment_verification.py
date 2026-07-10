"""add asynchronous enrollment verification jobs

Revision ID: 20260710_0012
Revises: 9bdd1ce109ec
"""

from alembic import op
import sqlalchemy as sa


revision = "20260710_0012"
down_revision = "9bdd1ce109ec"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "enrollment_verification_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("verification_id", sa.String(36), nullable=False),
        sa.Column("student_id", sa.String(64), sa.ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False),
        sa.Column("idempotency_key_hash", sa.String(64), nullable=False),
        sa.Column("owner_token_hash", sa.String(64), nullable=False),
        sa.Column("celery_task_id", sa.String(255), nullable=True, unique=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="queued"),
        sa.Column("stage", sa.String(32), nullable=False, server_default="uploading"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("temporary_images_json", sa.JSON(), nullable=False),
        sa.Column("failed_angles_json", sa.JSON(), nullable=False),
        sa.Column("stage_durations_json", sa.JSON(), nullable=False),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("upload_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("queued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("validation_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("embedding_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("database_committed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("student_id", "idempotency_key_hash", name="uq_verification_student_idempotency"),
    )
    op.create_index(
        "ix_enrollment_verification_jobs_verification_id",
        "enrollment_verification_jobs",
        ["verification_id"],
        unique=True,
    )
    op.create_index(
        "ix_enrollment_verification_jobs_student_id",
        "enrollment_verification_jobs",
        ["student_id"],
    )
    op.create_index(
        "ix_enrollment_verification_jobs_status",
        "enrollment_verification_jobs",
        ["status"],
    )


def downgrade() -> None:
    op.drop_table("enrollment_verification_jobs")
