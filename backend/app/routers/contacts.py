from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas.contact import ContactCreate, ContactResponse, ContactUpdate
from ..services.contact_service import (
    create_contact,
    get_contact_by_id,
    list_contacts,
    update_contact,
    delete_contact,
)

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact_endpoint(
    payload: ContactCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = create_contact(db, payload)
    return contact


@router.get("", response_model=list[ContactResponse])
def list_contacts_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return list_contacts(db)


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact_endpoint(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return contact


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact_endpoint(
    contact_id: int,
    payload: ContactUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    return update_contact(db, contact, payload)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact_endpoint(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    delete_contact(db, contact)
    return None
