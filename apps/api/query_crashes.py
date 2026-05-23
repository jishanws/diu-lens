from app.db.session import get_session_factory
from sqlalchemy import text

session_factory = get_session_factory()
with session_factory() as db:
    res = db.execute(text("SELECT id, request_id, endpoint_path, error_type, error_message, stack_trace, created_at FROM system_incidents ORDER BY created_at DESC LIMIT 5"))
    for row in res:
        print("---")
        print(row.error_message)
        print(row.stack_trace)
