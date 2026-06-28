from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas import LeadCreate, LeadResponse, LeadUpdate, DuplicateCheckResponse
from ..services.lead_service import (
    create_lead,
    get_lead_by_id,
    get_leads,
    update_lead,
    delete_lead,
    assign_lead,
    check_lead_duplicates,
    log_duplicate_attempt,
)
from ..services.notification_service import create_notification_event
from ..services.user_service import get_users
from ..services.websocket_notification_service import send_notification_sync
from ..schemas.user import UserRole

router = APIRouter(prefix="/leads", tags=["leads"])


def _notify_lead_submission(
    db: Session,
    background_tasks: BackgroundTasks,
    creator_id: UUID,
    creator_name: str | None,
) -> None:
    recipients = [
        user for user in get_users(db)
        if user.role in {UserRole.admin.value, UserRole.manager.value} and str(user.id) != str(creator_id)
    ]

    if not recipients:
        return

    title = "New lead created"
    message = f"{creator_name or 'An employee'} created a new lead."

    for recipient in recipients:
        notification = create_notification_event(
            db,
            user_id=recipient.id,
            title=title,
            message=message,
            type="lead_submitted",
            related_task_id=None,
        )

        notification_payload = {
            "type": "notification_event",
            "payload": {
                "id": str(notification.id),
                "user_id": str(notification.user_id),
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "related_task_id": None,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
            },
        }

        background_tasks.add_task(
            send_notification_sync,
            str(recipient.id),
            notification_payload,
        )


@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
def check_duplicates_endpoint(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Check if a lead is a duplicate before creating it.
    
    Returns:
    - 200 with duplicate info if duplicate found
    - 200 with duplicate=False if unique
    """
    result = check_lead_duplicates(db, payload)
    if result:
        return result.to_dict()
    return {
        "duplicate": False,
        "type": None,
        "message": "Lead is unique",
        "existing_lead": None,
    }


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead_endpoint(
    payload: LeadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Create a new lead with automatic duplicate checking.
    
    - Hard duplicates (mobile, email, etc.) will return HTTP 409
    - Soft duplicates (company fuzzy match) will return HTTP 409 with warning
    """
    # Check for duplicates
    duplicate_result = check_lead_duplicates(db, payload)
    
    if duplicate_result:
        # Log the duplicate attempt
        log_duplicate_attempt(
            db,
            payload,
            duplicate_result.existing_lead.get("id"),
            duplicate_result.duplicate_type,
            current_user.id,
        )
        
        # Hard duplicates block creation
        if duplicate_result.duplicate_type == "hard_duplicate":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=duplicate_result.to_dict(),
            )
        
        # Soft duplicates (potential) also block for now but can be overridden by admin
        # In a future iteration, we could add an override mechanism
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=duplicate_result.to_dict(),
        )
    
    # Create lead if not duplicate
    creator_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'name', None) or getattr(current_user, 'display_name', None) or None
    lead = create_lead(db, payload, creator_id=current_user.id)
    _notify_lead_submission(db, background_tasks, current_user.id, creator_name)
    return lead


@router.get("", response_model=List[LeadResponse])
def list_leads(
    skip: int = 0,
    limit: int = 25,
    search: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = {}
    if lead_status:
        filters["lead_status"] = lead_status
    if assigned_to:
        filters["assigned_to"] = assigned_to
    items, total = get_leads(db, skip=skip, limit=limit, search=search, filters=filters)
    return items


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead_endpoint(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead = update_lead(db, lead, payload)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead_endpoint(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    delete_lead(db, lead)
    return None


@router.post("/{lead_id}/assign", response_model=LeadResponse)
def assign_lead_endpoint(
    lead_id: int,
    assignee_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead = assign_lead(db, lead, assignee_id)
    return lead
