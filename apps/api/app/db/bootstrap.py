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
    from app.db import models  # noqa: F401
    from app.core.auth import hash_password
    from app.core.config import settings
    from sqlalchemy import select

    engine = db_session.get_engine()
    Base.metadata.create_all(bind=engine)

    # Optional super-admin bootstrap from environment
    if all([
        settings.bootstrap_admin_email,
        settings.bootstrap_admin_password,
        settings.bootstrap_admin_full_name
    ]):
        email = settings.bootstrap_admin_email.strip().lower()
        session_factory = db_session.get_session_factory()
        with session_factory() as db:
            existing = db.scalar(select(models.AdminUser).where(models.AdminUser.email == email))
            if existing is None:
                logger.info("Bootstrapping super-admin user: %s", email)
                admin = models.AdminUser(
                    email=email,
                    full_name=settings.bootstrap_admin_full_name.strip(),
                    password_hash=hash_password(settings.bootstrap_admin_password),
                    role="super_admin",
                    is_active=True,
                )
                db.add(admin)
                db.commit()
            else:
                logger.debug("Bootstrap admin already exists: %s", email)

    logger.info("Database initialized successfully")
