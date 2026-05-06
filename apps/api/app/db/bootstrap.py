"""Database bootstrap helpers for app startup."""

from __future__ import annotations

import logging

from sqlalchemy import inspect

import app.db.session as db_session
from app.db.base import Base

logger = logging.getLogger(__name__)


def initialize_database() -> None:
    """Import models and create required tables if they are missing."""
    # Import model modules explicitly so tables register on Base.metadata.
    import app.db.models.enrollments  # noqa: F401
    import app.db.models.students  # noqa: F401

    required_tables = ("students", "enrollments")
    missing_from_metadata = [name for name in required_tables if name not in Base.metadata.tables]
    if missing_from_metadata:
        missing_text = ", ".join(missing_from_metadata)
        raise RuntimeError(f"Missing required metadata table registration: {missing_text}")

    engine = db_session.get_engine()
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    missing = [name for name in required_tables if not inspector.has_table(name)]
    if missing:
        missing_text = ", ".join(missing)
        raise RuntimeError(f"Missing required table(s) after initialization: {missing_text}")

    logger.info("Database initialized successfully")
