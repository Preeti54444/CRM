from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas.notification import NotificationResponse
from ..services.notification_service import (
    delete_notification_event,
    get_notification_event,
    get_notification_events,
    get_unread_notification_count,
    mark_all_notifications_read,
    mark_notification_read,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[NotificationResponse]:
    return get_notification_events(db, current_user.id, skip=skip, limit=limit)


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict[str, int]:
    count = get_unread_notification_count(db, current_user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> NotificationResponse:
    notification = mark_notification_read(db, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return notification


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict[str, int]:
    updated = mark_all_notifications_read(db, current_user.id)
    return {"updated": updated}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict[str, str]:
    notification = get_notification_event(db, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    delete_notification_event(db, notification_id)
    return {"detail": "Notification deleted."}
