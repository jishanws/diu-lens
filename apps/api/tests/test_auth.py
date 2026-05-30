import pytest
from passlib.hash import bcrypt

from app.core import auth as auth_module
from app.db.models import AdminUser


def _bcrypt_backend_available() -> bool:
    try:
        bcrypt.get_backend()
        return True
    except Exception:
        return False


def test_admin_login_with_bcrypt_hash(db_session_factory, monkeypatch):
    if not _bcrypt_backend_available():
        pytest.skip("bcrypt backend not available in this environment.")

    password = "bcrypt-pass"
    hashed = bcrypt.hash(password)

    with db_session_factory() as db:
        db.add(
            AdminUser(
                email="bcrypt@example.com",
                full_name="Bcrypt Admin",
                password_hash=hashed,
                role="admin",
                is_active=True,
            )
        )
        db.commit()

    monkeypatch.setattr(
        auth_module, "get_session_factory", lambda: db_session_factory
    )
    admin = auth_module.authenticate_admin_user("bcrypt@example.com", password)

    assert admin is not None
