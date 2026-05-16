import time
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.concurrency import run_in_threadpool

from app.core.auth import bearer_scheme, require_admin
from app.core.face_matching import FaceMatchingError, match_face_probe
from app.core.recognition_audit import persist_recognition_metrics
from app.core.storage import ALLOWED_IMAGE_CONTENT_TYPES, MAX_UPLOAD_IMAGE_SIZE_BYTES


router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/recognition/match")
async def admin_match_face(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    threshold: float | None = Query(default=None, gt=0),
    top_k: int | None = Query(default=None, gt=0),
    candidate_pool_limit: int | None = Query(default=None, gt=0),
    debug: bool = Query(default=False),
    probe_label: str | None = Query(default=None, max_length=120),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, object]:
    admin_user = require_admin(credentials)
    admin_id = admin_user["id"] if admin_user else None
    
    start_time = time.monotonic()
    request_id = str(uuid.uuid4())

    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Unsupported image type for matching probe.",
            },
        )

    probe_bytes = await image.read(MAX_UPLOAD_IMAGE_SIZE_BYTES + 1)
    await image.close()

    if not probe_bytes:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Probe image is empty."},
        )

    if len(probe_bytes) > MAX_UPLOAD_IMAGE_SIZE_BYTES:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Probe image exceeds size limit."},
        )

    try:
        result = await run_in_threadpool(
            match_face_probe,
            probe_bytes,
            threshold=threshold,
            top_k=top_k,
            candidate_pool_limit=candidate_pool_limit,
            debug=debug,
            probe_label=probe_label,
        )
    except FaceMatchingError as exc:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc)},
        )

    processing_duration_ms = (time.monotonic() - start_time) * 1000

    background_tasks.add_task(
        persist_recognition_metrics,
        request_id=request_id,
        searched_by_admin_id=admin_id,
        searched_student_id=None,
        match_result=result,
        processing_duration_ms=processing_duration_ms,
    )

    return {
        "success": True,
        "message": "Face match search completed.",
        "request_id": request_id,
        **result,
    }
