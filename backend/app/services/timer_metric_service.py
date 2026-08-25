from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound
from datetime import datetime

from ..models.timer_metric import TimerMetric


def get_timer_metric_by_user(db: Session, user_id):
    return db.query(TimerMetric).filter(TimerMetric.user_id == user_id).one_or_none()


def list_timer_metrics(db: Session):
    return db.query(TimerMetric).all()


def upsert_timer_metric(db: Session, user_id, *, work_seconds=0, call_seconds=0, break_seconds=0, meeting_seconds=0, call_count=0):
    metric = get_timer_metric_by_user(db, user_id)
    if not metric:
        metric = TimerMetric(
            user_id=user_id,
            work_seconds=work_seconds or 0,
            call_seconds=call_seconds or 0,
            break_seconds=break_seconds or 0,
            meeting_seconds=meeting_seconds or 0,
            call_count=call_count or 0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(metric)
    else:
        metric.work_seconds = work_seconds or metric.work_seconds or 0
        metric.call_seconds = call_seconds or metric.call_seconds or 0
        metric.break_seconds = break_seconds or metric.break_seconds or 0
        metric.meeting_seconds = meeting_seconds or metric.meeting_seconds or 0
        metric.call_count = call_count if call_count is not None else metric.call_count
        metric.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(metric)
    return metric
