"""Database bootstrap helpers for app startup."""

from __future__ import annotations

import logging

from sqlalchemy import inspect

import app.db.session as db_session
from app.db.base import Base

logger = logging.getLogger(__name__)


def initialize_database() -> None:
    """Import models and create required tables if they are missing."""
    print("INITIALIZE_DATABASE CALLED", flush=True)
    logger.info("initialize_database() entered")

    # Import model modules explicitly so tables register on Base.metadata.
    from app.db.models.enrollments import Enrollment
    from app.db.models.students import Student

    registered_tables = tuple(Base.metadata.tables.keys())
    logger.info(f"Metadata tables: {list(Base.metadata.tables.keys())}")
    logger.info("Registered metadata tables before create_all: %s", registered_tables)
    logger.info(
        "Required tables registered before create_all: students=%s enrollments=%s",
        "students" in Base.metadata.tables,
        "enrollments" in Base.metadata.tables,
    )
    logger.info(
        "Model metadata identity before create_all: Base=%s Student=%s Enrollment=%s",
        id(Base.metadata),
        id(Student.__table__.metadata),
        id(Enrollment.__table__.metadata),
    )

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
