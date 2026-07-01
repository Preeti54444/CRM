from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.customer_profile import CustomerProfile
from ..schemas.customer_profile import CustomerProfileCreate, CustomerProfileUpdate
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event


def create_customer_profile(db: Session, payload: CustomerProfileCreate) -> CustomerProfile:
    obj = CustomerProfile(
        id=uuid4(),
        lead_id=payload.lead_id,
        company_type=payload.company_type,
        gst_number=payload.gst_number,
        pan_number=payload.pan_number,
        turnover=payload.turnover,
        business_vintage=payload.business_vintage,
        funding_requirement=payload.funding_requirement,
        assigned_rm=payload.assigned_rm,
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
            customer_id=obj.id,
            event_type="Customer Profile Created",
            description=f"Customer profile for lead {obj.lead_id} was created.",
        ),
        creator_id=None,
    )
    return obj


def get_customer_by_id(db: Session, customer_id: UUID) -> Optional[CustomerProfile]:
    return db.query(CustomerProfile).filter(CustomerProfile.id == customer_id).first()


def list_customers(db: Session) -> list[CustomerProfile]:
    """Retrieve all customer profiles"""
    return db.query(CustomerProfile).all()


def update_customer(db: Session, obj: CustomerProfile, payload: CustomerProfileUpdate) -> CustomerProfile:
    for field, value in payload.__dict__.items():
        if value is not None:
            setattr(obj, field, value)
    obj.updated_at = datetime.utcnow()
    db.add(obj)
    db.commit()
    db.refresh(obj)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=obj.lead_id,
            customer_id=obj.id,
            event_type="Customer Profile Updated",
            description=f"Customer profile for lead {obj.lead_id} was updated.",
        ),
        creator_id=None,
    )
    return obj


def delete_customer_profile(db: Session, obj: CustomerProfile) -> None:
    db.delete(obj)
    db.commit()
