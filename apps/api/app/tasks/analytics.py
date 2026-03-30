from app.tasks.worker import celery_app


@celery_app.task(name="calculate_popular_items")
def calculate_popular_items() -> dict[str, str]:
    return {"status": "queued", "task": "calculate_popular_items"}


@celery_app.task(name="daily_sales_summary")
def daily_sales_summary() -> dict[str, str]:
    return {"status": "queued", "task": "daily_sales_summary"}

