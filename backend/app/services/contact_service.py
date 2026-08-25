from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.contact import Contact
from ..schemas.contact import ContactCreate, ContactUpdate


def create_contact(db: Session, payload: ContactCreate) -> Contact:
    contact = Contact(
        contact_id=payload.contact_id if hasattr(payload, 'contact_id') and payload.contact_id else f"c-{datetime.utcnow().timestamp():.0f}",
        contact_name=payload.contact_name,
        designation=payload.designation,
        phone=payload.phone,
        alternate_phone=payload.alternate_phone,
        email=payload.email,
        alternate_email=payload.alternate_email,
        company_name=payload.company_name,
        company_registration_number=payload.company_registration_number,
        lead_id=payload.lead_id,
        contact_status=payload.contact_status or 'Active',
        is_primary_contact=payload.is_primary_contact or 'No',
        linkedin_profile=payload.linkedin_profile,
        city=payload.city,
        state=payload.state,
        country=payload.country,
        notes=payload.notes,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(contact)
    try:
        db.commit()
        db.refresh(contact)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return contact


def get_contact_by_id(db: Session, contact_id: int) -> Optional[Contact]:
    return db.query(Contact).filter(Contact.id == contact_id).first()


def list_contacts(db: Session) -> list[Contact]:
    return db.query(Contact).all()


def update_contact(db: Session, contact: Contact, payload: ContactUpdate) -> Contact:
    for field, value in payload.model_dump().items():
        if value is not None:
            setattr(contact, field, value)
    contact.updated_at = datetime.utcnow()
    db.add(contact)
    try:
        db.commit()
        db.refresh(contact)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return contact


def delete_contact(db: Session, contact: Contact) -> None:
    db.delete(contact)
    db.commit()
