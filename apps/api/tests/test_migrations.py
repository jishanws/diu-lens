from app.db.migrations import _alembic_safe_url


def test_alembic_safe_url_escapes_encoded_socket_paths() -> None:
    url = "postgresql+psycopg://user@/db?host=%2Ftmp&connect_timeout=5"

    assert _alembic_safe_url(url) == (
        "postgresql+psycopg://user@/db?host=%%2Ftmp&connect_timeout=5"
    )
