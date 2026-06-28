from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.notification import Notification
from ..models.notification_event import NotificationEvent


def create_notification(db: Session, user_id: UUID, title: str, message: str) -> Notification:
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications(db: Session, user_id: UUID, skip: int = 0, limit: int = 50):
    return db.query(Notification).filter(Notification.user_id == user_id).offset(skip).limit(limit).all()


def create_notification_event(
    db: Session,
    user_id: UUID,
    title: str,
    message: str,
    type: str = "general",
    related_task_id: Optional[UUID] = None,
) -> NotificationEvent:
    notification = NotificationEvent(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        related_task_id=related_task_id,
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notification_events(db: Session, user_id: UUID, skip: int = 0, limit: int = 50):
    return (
        db.query(NotificationEvent)
        .filter(NotificationEvent.user_id == user_id)
        .order_by(NotificationEvent.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_unread_notification_count(db: Session, user_id: UUID) -> int:
    return (
        db.query(func.count(NotificationEvent.id))
        .filter(NotificationEvent.user_id == user_id, NotificationEvent.is_read == False)
        .scalar()
        or 0
    )


def get_notification_event(db: Session, notification_id: UUID) -> Optional[NotificationEvent]:
    return db.query(NotificationEvent).filter(NotificationEvent.id == notification_id).first()


def mark_notification_read(db: Session, notification_id: UUID) -> Optional[NotificationEvent]:
    notification = get_notification_event(db, notification_id)
    if notification is None:
        return None
    notification.is_read = True
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_notifications_read(db: Session, user_id: UUID) -> int:
    updated = (
        db.query(NotificationEvent)
        .filter(NotificationEvent.user_id == user_id, NotificationEvent.is_read == False)
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated


def delete_notification_event(db: Session, notification_id: UUID) -> None:
    notification = db.query(NotificationEvent).filter(NotificationEvent.id == notification_id).first()
    if notification is not None:
        db.delete(notification)
        db.commit()
