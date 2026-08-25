from celery import Celery
from .config import settings

def make_celery():
    broker = settings.__dict__.get('celery_broker_url') or 'redis://redis:6379/0'
    backend = settings.__dict__.get('celery_result_backend') or broker
    celery = Celery('fundingsathi', broker=broker, backend=backend)
    # Load any celery config from settings if provided
    celery.conf.update({
        'task_serializer': 'json',
        'result_serializer': 'json',
        'accept_content': ['json'],
        'timezone': 'UTC',
        'enable_utc': True,
    })
    return celery


celery = make_celery()

@celery.task(bind=True)
def run_performance_checks(self):
    """Task wrapper to call performance checks from the synchronous scheduler.

    Importing inside the task avoids heavyweight imports when the worker starts.
    """
    try:
        from .services.performance_scheduler import perform_daily_checks
        perform_daily_checks()
        return {'status': 'ok'}
    except Exception as exc:
        raise
