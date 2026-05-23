import asyncio
from app.core.face_matching import match_face_probe
import logging
logging.basicConfig(level=logging.DEBUG)

with open("test_img.jpg", "rb") as f:
    img_bytes = f.read()

try:
    match_face_probe(img_bytes)
except Exception as e:
    import traceback
    traceback.print_exc()
