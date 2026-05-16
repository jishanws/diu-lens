"""Tracing middleware for FastAPI."""

import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.tracing import (
    clear_trace_context,
    generate_trace_id,
    set_trace_context,
)

class TracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        clear_trace_context()
        
        request_id = request.headers.get("X-Request-ID") or generate_trace_id()
        correlation_id = request.headers.get("X-Correlation-ID") or request_id
        
        set_trace_context(
            request_id=request_id,
            correlation_id=correlation_id,
        )
        
        # Inject request_id into state for easy access if needed
        request.state.request_id = request_id
        
        start_time = time.time()
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            clear_trace_context()
