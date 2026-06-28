import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas import LeadCreate, LeadResponse, LeadUpdate, UserRole
from ..services.lead_service import (
    create_lead,
    get_lead_by_id,
    get_leads,
    update_lead,
    delete_lead,
    assign_lead,
)
from ..services.notification_service import create_notification_event
from ..services.user_service import get_users
from ..services.websocket_notification_service import send_notification_sync, broadcast_data_sync_sync

router = APIRouter(prefix="/leads", tags=["leads"])
logger = logging.getLogger(__name__)


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


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead_endpoint(
    payload: LeadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    # TEMPORARY: Disable auth to test if request reaches backend
    # current_user=Depends(get_current_user),
):
    logger.info(f"POST /leads - Payload received: {payload.dict()}")
    # logger.info(f"POST /leads - Current user ID: {current_user.id}")
    
    try:
        # TEMPORARY: Use a default user ID for testing
        from uuid import UUID
        creator_id = UUID("5c0841e0-8083-41a1-a80e-b1e80f7f0052")  # The user ID from frontend
        creator_name = "Test User"
        
        lead = create_lead(db, payload, creator_id=creator_id)
        _notify_lead_submission(db, background_tasks, creator_id, creator_name)
        
        # Broadcast data sync event for real-time updates
        lead_response = LeadResponse.model_validate(lead)
        background_tasks.add_task(
            broadcast_data_sync_sync,
            'lead',
            'create',
            lead_response.model_dump()
        )
        
        logger.info(f"POST /leads - Lead created successfully: ID={lead.id}")
        return lead
    except Exception as e:
        logger.error(f"POST /leads - Exception occurred: {type(e).__name__}: {str(e)}", exc_info=True)
        raise


@router.get("", response_model=List[LeadResponse])
def list_leads(
    skip: int = 0,
    limit: int = 25,
    search: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    # TEMPORARY: Disable auth to test GET endpoint
    # current_user=Depends(get_current_user),
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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead = update_lead(db, lead, payload)
    
    # Broadcast data sync event for real-time updates
    lead_response = LeadResponse.model_validate(lead)
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'lead',
        'update',
        lead_response.model_dump()
    )
    
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead_endpoint(
    lead_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    
    # Broadcast data sync event before deletion
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'lead',
        'delete',
        {'id': lead_id}
    )
    
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
