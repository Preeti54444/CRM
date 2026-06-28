from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas import FollowUpCreate, FollowUpResponse, FollowUpUpdate
from ..services.followup_service import create_followup, get_followup_by_id, update_followup, complete_followup
from ..models.followup import FollowUp

router = APIRouter(prefix="/followups", tags=["followups"])


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_followup_endpoint(payload: FollowUpCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = create_followup(db, payload, creator_id=current_user.id)
    return obj


@router.get("", response_model=list[FollowUpResponse])
def list_followups(
    lead_id: Optional[int] = None,
    assigned_to: Optional[UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(FollowUp)
    if lead_id is not None:
        query = query.filter(FollowUp.lead_id == lead_id)
    if assigned_to is not None:
        query = query.filter(FollowUp.assigned_to == assigned_to)
    if status is not None:
        query = query.filter(FollowUp.status == status)
    items = query.order_by(FollowUp.followup_date.asc()).limit(100).all()
    return items


@router.put("/{followup_id}", response_model=FollowUpResponse)
def update_followup_endpoint(followup_id: UUID, payload: FollowUpUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = get_followup_by_id(db, followup_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")
    obj = update_followup(db, obj, payload)
    return obj


@router.post("/{followup_id}/complete", response_model=FollowUpResponse)
def complete_followup_endpoint(followup_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    obj = get_followup_by_id(db, followup_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found")
    obj = complete_followup(db, obj, completer_id=current_user.id)
    return obj
