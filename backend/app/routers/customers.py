from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas import CustomerProfileCreate, CustomerProfileResponse, CustomerProfileUpdate
from ..services.customer_service import create_customer_profile, get_customer_by_id, update_customer, delete_customer_profile

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerProfileResponse, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerProfileCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = create_customer_profile(db, payload)
    return obj


@router.get("/{customer_id}", response_model=CustomerProfileResponse)
def get_customer(customer_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = get_customer_by_id(db, customer_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return obj


@router.put("/{customer_id}", response_model=CustomerProfileResponse)
def update_customer_endpoint(customer_id: UUID, payload: CustomerProfileUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = get_customer_by_id(db, customer_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    obj = update_customer(db, obj, payload)
    return obj


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_endpoint(customer_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = get_customer_by_id(db, customer_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    delete_customer_profile(db, obj)
    return None
