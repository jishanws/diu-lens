import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import settings


def _configure_logging() -> None:
    level = logging.DEBUG if settings.environment == "development" else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(message)s",
    )


def create_app() -> FastAPI:
    _configure_logging()
    logger = logging.getLogger(__name__)

    app = FastAPI(title=settings.app_name, version=settings.version)

    # Custom CORS middleware

    @app.middleware("http")
    async def cors_fix(request: Request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response

    @app.options("/{path:path}")
    async def options_handler(path: str):
        return JSONResponse(status_code=200, content={})

    app.include_router(api_router)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        if exc.status_code >= 500:
            logger.exception("HTTP exception: %s", exc.detail)
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": "Internal server error"},
            )
        logger.warning("HTTP exception: status=%s detail=%s", exc.status_code, exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )

    @app.get("/", tags=["root"])
    async def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "version": settings.version,
            "status": "running",
        }

    return app


app = create_app()
