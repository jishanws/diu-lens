import os
import logging
from celery import Celery
from celery.signals import before_task_publish, task_prerun, task_postrun, setup_logging, task_failure

from app.core.incident_timeline import snapshot_failure
from app.db.session import get_session_factory

@task_failure.connect
def handle_task_failure(task_id=None, exception=None, traceback=None, einfo=None, *args, **kwargs):
    """Snapshot unhandled exceptions from Celery tasks."""
    session_factory = get_session_factory()
    with session_factory() as db:
        snapshot_failure(
            db, 
            exception, 
            additional_metadata={"celery_task_id": task_id, "args": repr(kwargs.get("args")), "kwargs": repr(kwargs.get("kwargs"))}
        )

from app.core.config import settings
from app.core.tracing import (
    TracingFilter,
    clear_trace_context,
    set_trace_context,
    request_id_ctx,
    correlation_id_ctx,
)

celery_app = Celery(
    "diu_lens_tasks",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.biometric_tasks"],
)

@setup_logging.connect
def config_loggers(*args, **kw):
    """Setup custom logger for Celery workers to include tracing filter."""
    level = logging.DEBUG if settings.environment == "development" else logging.INFO
    logger = logging.getLogger()
    logger.setLevel(level)
    
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "%(asctime)s %(levelname)s [req:%(request_id)s|task:%(task_id)s] %(message)s"
    )
    handler.setFormatter(formatter)
    handler.addFilter(TracingFilter())
    logger.addHandler(handler)

@before_task_publish.connect
def inject_tracing_headers(headers=None, **kwargs):
    """Inject current trace IDs into the task headers before publish."""
    if headers is not None:
        headers["x_request_id"] = request_id_ctx.get()
        headers["x_correlation_id"] = correlation_id_ctx.get()

@task_prerun.connect
def setup_tracing_context(task_id=None, task=None, *args, **kwargs):
    """Extract trace IDs from task request and set context variables."""
    clear_trace_context()
    
    # Celery 5.x keeps custom headers in request
    req = task.request
    request_id = getattr(req, "x_request_id", None)
    correlation_id = getattr(req, "x_correlation_id", None)
    
    set_trace_context(
        request_id=request_id,
        correlation_id=correlation_id,
        task_id=task_id,
        worker_hostname=task.request.hostname,
    )

@task_postrun.connect
def teardown_tracing_context(*args, **kwargs):
    clear_trace_context()


from celery.schedules import crontab

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 minutes hard limit
    task_soft_time_limit=300,  # 5 minutes soft limit
    worker_prefetch_multiplier=1, # Don't grab many tasks at once if long running
    task_acks_late=True, # Requeue if worker dies before finishing
)

celery_app.conf.beat_schedule = {
    "recover-zombie-tasks-every-5-minutes": {
        "task": "app.tasks.biometric_tasks.recover_zombie_tasks_task",
        "schedule": crontab(minute="*/5"),
    },
    "monitor-system-health-every-minute": {
        "task": "app.tasks.biometric_tasks.monitor_system_health_task",
        "schedule": crontab(minute="*"),
    },
}
