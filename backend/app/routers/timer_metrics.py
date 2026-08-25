from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas.timer_metric import TimerMetricCreate, TimerMetricResponse, TimerMetricUpdate
from ..services.timer_metric_service import (
    get_timer_metric_by_user,
    list_timer_metrics,
    upsert_timer_metric,
)

router = APIRouter(prefix="/api/timer-metrics", tags=["timer_metrics"])


def _is_staff_user(current_user) -> bool:
    return str(getattr(current_user, 'role', '')).lower() in {'admin', 'manager'}


@router.get("", response_model=List[TimerMetricResponse])
def list_timer_metrics_route(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not _is_staff_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
    metrics = list_timer_metrics(db)
    return metrics


@router.get("/{user_id}", response_model=TimerMetricResponse)
def get_timer_metric_route(user_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # allow user to fetch their own metric or staff to fetch any
    if str(current_user.id) != str(user_id) and not _is_staff_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    metric = get_timer_metric_by_user(db, user_id)
    if not metric:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timer metric not found")
    return metric


@router.put("/{user_id}", response_model=TimerMetricResponse)
def upsert_timer_metric_route(user_id: str, payload: TimerMetricUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # allow updating own metric or staff
    if str(current_user.id) != str(user_id) and not _is_staff_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    metric = upsert_timer_metric(
        db,
        user_id,
        work_seconds=payload.work_seconds,
        call_seconds=payload.call_seconds,
        break_seconds=payload.break_seconds,
        meeting_seconds=payload.meeting_seconds,
        call_count=payload.call_count,
    )

    return metric
