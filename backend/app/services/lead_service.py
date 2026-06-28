import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.lead import Lead
from ..schemas.lead import LeadCreate, LeadUpdate
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event
from ..services.notification_service import create_notification

logger = logging.getLogger(__name__)


def create_lead(db: Session, lead_in: LeadCreate, creator_id: Optional[UUID] = None) -> Lead:
    logger.info(f"Creating lead with payload: {lead_in.model_dump()}")
    logger.info(f"Creator ID: {creator_id}")
    
    new_lead = Lead(
        lead_name=lead_in.lead_name,
        company_name=lead_in.company_name,
        mobile=lead_in.mobile,
        alternate_mobile=lead_in.alternate_mobile,
        email=lead_in.email,
        company_email=lead_in.company_email,
        city=lead_in.city,
        state=lead_in.state,
        product_type=lead_in.product_type,
        funding_amount=lead_in.funding_amount,
        lead_source=lead_in.lead_source,
        lead_status=lead_in.lead_status,
        assigned_to=lead_in.assigned_to,
        remarks=lead_in.remarks,
        created_by=creator_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=new_lead.id,
            event_type="Lead Created",
            description=f"Lead '{new_lead.lead_name}' was created.",
        ),
        creator_id=creator_id,
    )
    return new_lead


def get_lead_by_id(db: Session, lead_id: int | str) -> Optional[Lead]:
    if isinstance(lead_id, str):
        try:
            lead_id = int(lead_id)
        except ValueError:
            return None
    return db.query(Lead).filter(Lead.id == lead_id).first()


def get_leads(db: Session, skip: int = 0, limit: int = 50, search: Optional[str] = None, filters: dict | None = None):
    q = db.query(Lead)
    if search:
        like = f"%{search}%"
        q = q.filter(Lead.lead_name.ilike(like) | Lead.company_name.ilike(like) | Lead.mobile.ilike(like) | Lead.email.ilike(like))
    if filters:
        if "lead_status" in filters:
            q = q.filter(Lead.lead_status == filters["lead_status"])
        if "assigned_to" in filters:
            q = q.filter(Lead.assigned_to == filters["assigned_to"])
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return items, total


def update_lead(db: Session, lead: Lead, lead_in: LeadUpdate, updater_id: Optional[UUID] = None) -> Lead:
    changes = []
    for field, value in lead_in.__dict__.items():
        if value is not None and getattr(lead, field) != value:
            changes.append(f"{field} updated")
            setattr(lead, field, value)
    lead.updated_at = datetime.utcnow()
    db.add(lead)
    db.commit()
    db.refresh(lead)
    if changes:
        add_timeline_event(
            db,
            TimelineEventCreate(
                lead_id=lead.id,
                event_type="Lead Updated",
                description="; ".join(changes),
            ),
            creator_id=updater_id,
        )
    return lead


def delete_lead(db: Session, lead: Lead) -> None:
    db.delete(lead)
    db.commit()


def assign_lead(db: Session, lead: Lead, user_id: UUID, assigner_id: Optional[UUID] = None) -> Lead:
    previous_assignee = lead.assigned_to
    lead.assigned_to = user_id
    lead.updated_at = datetime.utcnow()
    db.add(lead)
    db.commit()
    db.refresh(lead)
    event_type = "Lead Assigned" if previous_assignee is None else "Lead Reassigned"
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=lead.id,
            event_type=event_type,
            description=f"Lead assigned to user {user_id}.",
        ),
        creator_id=assigner_id,
    )
    if user_id is not None:
        create_notification(
            db,
            user_id,
            title="Lead Assignment",
            message=f"You have been assigned to lead {lead.id}: {lead.lead_name}.",
        )
    return lead
