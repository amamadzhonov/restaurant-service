from celery import Celery

from app.core.config import get_settings

settings = get_settings()
celery_app = Celery("restaurant-menu")
celery_app.conf.update(
    broker_url=settings.REDIS_URL,
    result_backend=settings.REDIS_URL,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
)
celery_app.autodiscover_tasks(["app.tasks"])

