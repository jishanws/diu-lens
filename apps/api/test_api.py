from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import create_access_token
import json

client = TestClient(app)
token = create_access_token(admin_id=1, email="admin@test.com", role="super_admin")

with open("test_img.jpg", "rb") as f:
    res = client.post(
        "/admin/recognition/match",
        headers={"Authorization": f"Bearer {token}"},
        files={"image": ("test_img.jpg", f, "image/jpeg")}
    )

print("STATUS:", res.status_code)
print("BODY:", res.text)
