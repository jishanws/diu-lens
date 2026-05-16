"""Global request correlation and operational tracing."""

from __future__ import annotations

import contextvars
import logging
import uuid
from typing import Any

# Context variables for tracing
request_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("request_id", default=None)
correlation_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("correlation_id", default=None)
task_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("task_id", default=None)
student_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("student_id", default=None)
enrollment_id_ctx: contextvars.ContextVar[int | None] = contextvars.ContextVar("enrollment_id", default=None)
worker_hostname_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("worker_hostname", default=None)
processing_state_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar("processing_state", default=None)


class TracingFilter(logging.Filter):
    """Injects tracing context variables into log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get() or "-"
        record.correlation_id = correlation_id_ctx.get() or "-"
        record.task_id = task_id_ctx.get() or "-"
        record.student_id = student_id_ctx.get() or "-"
        record.enrollment_id = enrollment_id_ctx.get() or "-"
        record.worker_hostname = worker_hostname_ctx.get() or "-"
        record.processing_state = processing_state_ctx.get() or "-"
        return True


def generate_trace_id() -> str:
    """Generate a unique trace ID."""
    return str(uuid.uuid4())


def get_current_request_id() -> str | None:
    return request_id_ctx.get()

def get_current_task_id() -> str | None:
    return task_id_ctx.get()

def set_trace_context(
    request_id: str | None = None,
    correlation_id: str | None = None,
    task_id: str | None = None,
    student_id: str | None = None,
    enrollment_id: int | None = None,
    worker_hostname: str | None = None,
    processing_state: str | None = None,
) -> None:
    """Helper to set trace context variables."""
    if request_id is not None:
        request_id_ctx.set(request_id)
    if correlation_id is not None:
        correlation_id_ctx.set(correlation_id)
    if task_id is not None:
        task_id_ctx.set(task_id)
    if student_id is not None:
        student_id_ctx.set(student_id)
    if enrollment_id is not None:
        enrollment_id_ctx.set(enrollment_id)
    if worker_hostname is not None:
        worker_hostname_ctx.set(worker_hostname)
    if processing_state is not None:
        processing_state_ctx.set(processing_state)

def clear_trace_context() -> None:
    """Helper to clear trace context variables."""
    request_id_ctx.set(None)
    correlation_id_ctx.set(None)
    task_id_ctx.set(None)
    student_id_ctx.set(None)
    enrollment_id_ctx.set(None)
    worker_hostname_ctx.set(None)
    processing_state_ctx.set(None)
