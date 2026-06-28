from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas import TimelineEventCreate, TimelineEventResponse
from ..services.timeline_service import add_timeline_event
from ..models.timeline import TimelineEvent

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.post("", response_model=TimelineEventResponse, status_code=status.HTTP_201_CREATED)
def create_timeline_event(payload: TimelineEventCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    event = add_timeline_event(db, payload, creator_id=current_user.id)
    return event


@router.get("/lead/{lead_id}", response_model=List[TimelineEventResponse])
def get_lead_timeline(lead_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    items = db.query(TimelineEvent).filter(TimelineEvent.lead_id == lead_id).order_by(TimelineEvent.created_at.asc()).all()
    return items


@router.get("/customer/{customer_id}", response_model=List[TimelineEventResponse])
def get_customer_timeline(customer_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    items = db.query(TimelineEvent).filter(TimelineEvent.customer_id == customer_id).order_by(TimelineEvent.created_at.asc()).all()
    return items
