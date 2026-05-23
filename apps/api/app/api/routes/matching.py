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
    admin_id = admin_user.id if admin_user else None
    
    start_time = time.monotonic()
    request_id = str(uuid.uuid4())
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info("[recognition] Request received request_id=%s admin_id=%s", request_id, admin_id)

    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "message": "Unsupported image type for matching probe.",
            },
        )

    try:
        probe_bytes = await image.read(MAX_UPLOAD_IMAGE_SIZE_BYTES + 1)
        await image.close()
    except Exception as exc:
        logger.error("[recognition] Failed to read image request_id=%s exc=%s", request_id, exc)
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Failed to read image upload."},
        )

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

    logger.info("[recognition] Image parsed and ready for processing request_id=%s size=%s bytes", request_id, len(probe_bytes))

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
        logger.info("[recognition] Pipeline completed successfully request_id=%s matches=%s", request_id, len(result.get("candidates", [])))
    except FaceMatchingError as exc:
        logger.warning("[recognition] Face matching error request_id=%s exc=%s", request_id, exc)
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": str(exc)},
        )
    except Exception as exc:
        logger.exception("[recognition] Unexpected pipeline crash request_id=%s exc=%s", request_id, exc)
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Recognition pipeline failed to process image."},
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
