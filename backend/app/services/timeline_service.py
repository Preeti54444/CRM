from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from ..models.timeline import TimelineEvent
from ..schemas.timeline import TimelineEventCreate


def add_timeline_event(db: Session, payload: TimelineEventCreate, creator_id: Optional[UUID] = None) -> TimelineEvent:
    obj = TimelineEvent(
        id=uuid4(),
        lead_id=payload.lead_id,
        customer_id=payload.customer_id,
        event_type=payload.event_type,
        description=payload.description,
        event_metadata=payload.event_metadata,
        created_by=creator_id,
        created_at=datetime.utcnow(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
