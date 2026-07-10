"""Alembic migration runner and schema validation helpers."""

from __future__ import annotations

import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.core.config import settings
from app.db.models.enrollments import Enrollment
from app.db.session import get_engine

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ALEMBIC_INI = _PROJECT_ROOT / "alembic.ini"
_MIGRATIONS_DIR = _PROJECT_ROOT / "migrations"


def _alembic_safe_url(database_url: str) -> str:
    """Escape percent signs consumed by ConfigParser interpolation."""
    return database_url.replace("%", "%%")


def run_migrations_to_head() -> None:
    """Apply Alembic migrations up to head."""
    if os.getenv("PYTEST_CURRENT_TEST"):
        return

    config = Config(str(_ALEMBIC_INI))
    config.set_main_option("script_location", str(_MIGRATIONS_DIR))
    config.set_main_option("sqlalchemy.url", _alembic_safe_url(settings.database_url))
    command.upgrade(config, "head")


def assert_enrollments_schema_matches_model() -> None:
    """Validate that the enrollments table columns match the ORM model."""
    inspector = inspect(get_engine())
    if not inspector.has_table("enrollments"):
        raise RuntimeError("Missing required table: enrollments")

    db_columns = {column["name"] for column in inspector.get_columns("enrollments")}
    model_columns = {column.name for column in Enrollment.__table__.columns}

    missing_columns = sorted(model_columns - db_columns)
    extra_columns = sorted(db_columns - model_columns)

    if missing_columns or extra_columns:
        raise RuntimeError(
            "enrollments schema mismatch. "
            f"missing_columns={missing_columns}, extra_columns={extra_columns}"
        )
