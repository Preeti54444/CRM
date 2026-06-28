from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.followup import FollowUp
from ..schemas.followup import FollowUpCreate, FollowUpUpdate
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event
from ..services.notification_service import create_notification


def create_followup(db: Session, payload: FollowUpCreate, creator_id: Optional[UUID] = None) -> FollowUp:
    obj = FollowUp(
        id=uuid4(),
        lead_id=payload.lead_id,
        assigned_to=payload.assigned_to,
        followup_date=payload.followup_date,
        followup_type=payload.followup_type,
        notes=payload.notes,
        next_followup_date=payload.next_followup_date,
        status=payload.status or "scheduled",
        created_by=creator_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=obj.lead_id,
            event_type="Follow-Up Added",
            description=f"Follow-up scheduled for {obj.followup_date.isoformat()}.",
        ),
        creator_id=creator_id,
    )
    if obj.assigned_to is not None:
        create_notification(
            db,
            obj.assigned_to,
            title="New Follow-Up Scheduled",
            message=f"A follow-up has been scheduled for lead {obj.lead_id} on {obj.followup_date.isoformat()}.",
        )
    return obj


def get_followup_by_id(db: Session, followup_id: UUID) -> Optional[FollowUp]:
    return db.query(FollowUp).filter(FollowUp.id == followup_id).first()


def update_followup(db: Session, obj: FollowUp, payload: FollowUpUpdate) -> FollowUp:
    for field, value in payload.__dict__.items():
        if value is not None:
            setattr(obj, field, value)
    obj.updated_at = datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def complete_followup(db: Session, obj: FollowUp, completer_id: Optional[UUID] = None) -> FollowUp:
    obj.status = "completed"
    obj.updated_at = datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=obj.lead_id,
            event_type="Follow-Up Completed",
            description=f"Follow-up completed on {datetime.utcnow().isoformat()}.",
        ),
        creator_id=completer_id,
    )
    if obj.assigned_to is not None:
        create_notification(
            db,
            obj.assigned_to,
            title="Follow-Up Completed",
            message=f"A follow-up for lead {obj.lead_id} has been marked completed.",
        )
    return obj
