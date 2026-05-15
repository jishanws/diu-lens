import os
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "diu_lens_tasks",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.biometric_tasks"],
)

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
}
