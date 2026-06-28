from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy.orm import Session

from ..models.activity_log import ActivityLog


def create_activity_log(
    db: Session,
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
) -> ActivityLog:
    log = ActivityLog(
        id=uuid4(),
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        created_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
