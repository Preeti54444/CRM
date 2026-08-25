import datetime
from pydantic import BaseModel
import logging
import csv
import io
import html
import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy import and_
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas import LeadCreate, LeadResponse, LeadUpdate, LeadDuplicateCheckRequest, OwnershipTransferRequest, UserRole, LeadTakeoverRequestCreate, LeadTakeoverRequestResponse, LeadInterestedRequestCreate, LeadInterestedRequestResponse
from ..services.lead_service import (
    create_lead,
    get_lead_by_id,
    get_leads,
    update_lead,
    delete_lead,
    assign_lead,
)
from ..services.notification_service import create_notification_event, get_admin_notification_recipients
from ..services.ownership_service import OwnershipService
from ..services.user_service import get_users
from ..services.websocket_notification_service import send_notification_sync, broadcast_data_sync_sync
from ..models.lead import Lead
from ..models.lead_takeover_request import LeadTakeoverRequest
from ..models.lead_interested_request import LeadInterestedRequest

router = APIRouter(prefix="/leads", tags=["leads"])
logger = logging.getLogger(__name__)


class ApprovalReviewPayload(BaseModel):
    decision: str
    review_comment: Optional[str] = None


def serialize_lead_with_mode_info(lead):
    lead_data = LeadResponse.model_validate(lead).model_dump()
    lead_data["mode"] = OwnershipService.get_lead_status(lead)
    lead_data["lock_info"] = OwnershipService.get_lock_info(lead)
    return lead_data


def _notify_lead_submission(
    db: Session,
    background_tasks: BackgroundTasks,
    creator_id: UUID,
    creator_name: str | None,
) -> None:
    recipients = get_admin_notification_recipients(db, exclude_user_id=creator_id)
    for recipient in recipients:
        title = "New lead created"
        message = f"{creator_name or 'An employee'} created a new lead."

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
    current_user=Depends(get_current_user),
):
    logger.info(f"POST /leads - Payload received: {payload.dict()}")
    logger.info(f"POST /leads - Payload JSON: {payload.model_dump_json()}")
    logger.info(f"POST /leads - Current user ID: {current_user.id}, email: {current_user.email}")
    
    try:
        creator_id = current_user.id
        creator_name = getattr(current_user, "full_name", None) or current_user.email

        if payload.company_name and payload.mobile and payload.email:
            existing_lead = db.query(Lead).filter(
                Lead.company_name == payload.company_name,
                Lead.mobile == payload.mobile,
                Lead.email == payload.email,
                Lead.vertical == payload.vertical,
                Lead.sub_product == payload.sub_product,
            ).first()
            if existing_lead:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Duplicate lead exists for the same company, mobile, and email."
                )
        
        lead = create_lead(db, payload, creator_id=creator_id)
        _notify_lead_submission(db, background_tasks, creator_id, creator_name)
        
        # Broadcast data sync event for real-time updates
        lead_response = serialize_lead_with_mode_info(lead)
        background_tasks.add_task(
            broadcast_data_sync_sync,
            'lead',
            'create',
            lead_response
        )
        
        logger.info(f"POST /leads - Lead created successfully: ID={lead.id}")
        return lead_response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"POST /leads - Exception occurred: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Lead creation failed: {str(e)}")


@router.get("")
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
    # Only apply assigned_to filter if explicitly provided by the user
    # Admins and managers should see all leads unless they specifically filter by assigned_to
    if assigned_to:
        filters["assigned_to"] = assigned_to
    
    # Log the current user and filters for debugging
    logger.info(f"[DEBUG] GET /leads - User: {current_user.id}, Role: {current_user.role}, Email: {current_user.email}, Filters: {filters}")
    
    items, total = get_leads(db, skip=skip, limit=limit, search=search, filters=filters, user_id=current_user.id, user_role=current_user.role)

    # DEBUG: Log response before returning
    logger.info(f"[DEBUG] GET /leads - Returning {len(items)} leads, total: {total}")

    # Ensure Pydantic serialization so new fields like `designation` are included
    serialized = [serialize_lead_with_mode_info(i) for i in items]
    return {"items": serialized, "total": total}


@router.get("/new-leads")
def list_new_leads(
    skip: int = 0,
    limit: int = 25,
    search: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get leads without call activity (for Lead Management)"""
    filters = {}
    if lead_status:
        filters["lead_status"] = lead_status
    if assigned_to:
        filters["assigned_to"] = assigned_to
    
    logger.info(f"GET /leads/new-leads - User: {current_user.id}, Role: {current_user.role}")
    
    items, total = get_leads(db, skip=skip, limit=limit, search=search, filters=filters, user_id=current_user.id, user_role=current_user.role)

    # Filter to only include leads without call activity
    new_leads = [lead for lead in items if not lead.has_call_activity and not lead.has_followup]
    new_total = len(new_leads)

    serialized = [serialize_lead_with_mode_info(i) for i in new_leads]
    return {"items": serialized, "total": new_total}


@router.get("/call-management")
def list_call_management_leads(
    skip: int = 0,
    limit: int = 25,
    search: Optional[str] = Query(None),
    lead_status: Optional[str] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get leads with call activity (for Call Management)"""
    filters = {}
    if lead_status:
        filters["lead_status"] = lead_status
    if assigned_to:
        filters["assigned_to"] = assigned_to
    
    logger.info(f"GET /leads/call-management - User: {current_user.id}, Role: {current_user.role}")
    
    items, total = get_leads(db, skip=skip, limit=limit, search=search, filters=filters, user_id=current_user.id, user_role=current_user.role)

    # Filter to only include leads with call activity
    call_leads = [lead for lead in items if lead.has_call_activity or lead.has_followup]
    call_total = len(call_leads)

    serialized = [serialize_lead_with_mode_info(i) for i in call_leads]
    return {"items": serialized, "total": call_total}


@router.get("/search")
def search_leads_before_id_route(
    company_name: Optional[str] = Query(None),
    mobile: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return search_leads(company_name, mobile, email, db, current_user)


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    full_access_roles = {"admin", "branch_manager", "manager", "sales_manager"}
    user_role = str(current_user.role or "").strip().lower()
    if user_role not in full_access_roles and lead.created_by != current_user.id and lead.assigned_to != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return serialize_lead_with_mode_info(lead)


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

    permissions = OwnershipService.check_user_permissions(lead_id, str(current_user.id), db)
    if permissions["permission_level"] == "owner":
        pass
    elif permissions["permission_level"] == "restricted":
        allowed_fields = {
            "remarks", "learning_challenge", "followup_note",
            "next_followup_date", "followup_time", "followup_type",
            "purpose_of_call", "product_service_discussed", "call_outcome",
            "date_of_first_call"
        }
        updated_fields = {k for k, v in payload.model_dump(exclude_none=True).items() if k != "updated_at"}
        invalid_fields = updated_fields - allowed_fields
        if invalid_fields:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=("Restricted users can only update note and follow-up fields: "
                        f"{', '.join(sorted(allowed_fields))}. "
                        f"Attempted: {', '.join(sorted(invalid_fields))}")
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to update this lead."
        )

    lead = update_lead(db, lead, payload, updater_id=current_user.id, background_tasks=background_tasks)
    
    # Broadcast data sync event for real-time updates
    lead_response = serialize_lead_with_mode_info(lead)
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'lead',
        'update',
        lead_response
    )
    
    return lead_response


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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead = assign_lead(db, lead, assignee_id)
    
    # Broadcast data sync event for real-time updates
    lead_response = serialize_lead_with_mode_info(lead)
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'lead',
        'update',
        lead_response
    )
    
    return lead_response


@router.post("/{lead_id}/takeover-request", response_model=LeadTakeoverRequestResponse, status_code=status.HTTP_201_CREATED)
def create_takeover_request(
    lead_id: int,
    payload: LeadTakeoverRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a takeover request for a lead"""
    # Check if lead exists
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        try:
            requester_id = getattr(current_user, 'id', None)
        except Exception:
            requester_id = None
        logger.warning(f"Takeover request received for missing lead id={lead_id} by user={requester_id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    
    # Check if there's already a pending request for this lead by this user
    existing_request = db.query(LeadTakeoverRequest).filter(
        LeadTakeoverRequest.lead_id == lead_id,
        LeadTakeoverRequest.requester_id == current_user.id,
        LeadTakeoverRequest.status == "pending"
    ).first()
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending takeover request for this lead"
        )
    
    # Create the takeover request
    request_reason = payload.request_reason or getattr(payload, 'reason', None)
    takeover_request = LeadTakeoverRequest(
        lead_id=lead_id,
        request_reason=request_reason,
        requester_id=current_user.id,
        requester_name=getattr(current_user, "full_name", None) or current_user.email,
        status="pending"
    )
    
    db.add(takeover_request)
    db.commit()
    db.refresh(takeover_request)

    # Send an in-app notification to admins/managers
    # Log recipients and broaden to include all admins/managers (including requester's own org-level admins)
    recipients = get_admin_notification_recipients(db, exclude_user_id=current_user.id)

    if not recipients:
        logger.info('Takeover request recipients computed: none')
        return

    for recipient in recipients:
        logger.info(f"Takeover request recipient computed: {recipient.id}:{recipient.email or ''}")
        try:
            notification = create_notification_event(
                db,
                user_id=recipient.id,
                title="New Lead Takeover Request",
                message=f"{takeover_request.requester_name or current_user.email} has requested to take over lead: {lead.company_name or lead.lead_name}",
                type="takeover_request",
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
                    "related_task_id": str(notification.related_task_id) if notification.related_task_id else None,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                },
            }

            background_tasks.add_task(
                send_notification_sync,
                str(recipient.id),
                notification_payload,
            )
        except Exception:
            logger.exception("Failed to create/send notification event for takeover request to recipient %s", getattr(recipient, 'id', None))
    
    logger.info(f"Takeover request created for lead {lead_id} by user {current_user.id}")
    
    return LeadTakeoverRequestResponse.model_validate(takeover_request)


@router.get("/takeover-requests/pending", response_model=List[LeadTakeoverRequestResponse])
def list_pending_takeover_requests(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    return [
        LeadTakeoverRequestResponse.model_validate(request)
        for request in db.query(LeadTakeoverRequest)
        .filter(LeadTakeoverRequest.status == "pending")
        .order_by(LeadTakeoverRequest.created_at.desc())
        .all()
    ]


@router.post("/{lead_id}/interested-request", response_model=LeadInterestedRequestResponse, status_code=status.HTTP_201_CREATED)
def create_interested_request(
    lead_id: int,
    payload: LeadInterestedRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create an interested request for a lead"""
    # Check if lead exists
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    
    # Check if there's already a pending request for this lead by this user
    existing_request = db.query(LeadInterestedRequest).filter(
        LeadInterestedRequest.lead_id == lead_id,
        LeadInterestedRequest.requester_id == current_user.id,
        LeadInterestedRequest.status == "pending"
    ).first()
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending interest request for this lead"
        )
    
    # Create the interested request
    request_reason = payload.request_reason or getattr(payload, 'reason', None)
    interested_request = LeadInterestedRequest(
        lead_id=lead_id,
        request_reason=request_reason,
        requester_id=current_user.id,
        requester_name=getattr(current_user, "full_name", None) or current_user.email,
        status="pending"
    )
    
    db.add(interested_request)
    db.commit()
    db.refresh(interested_request)
    
    # Notify admins and managers about the new interested request
    recipients = get_admin_notification_recipients(db, exclude_user_id=current_user.id)
    for recipient in recipients:
        notification = create_notification_event(
            db,
            user_id=recipient.id,
            title="New Lead Interest Request",
            message=f"{interested_request.requester_name or current_user.email} has expressed interest in lead: {lead.company_name or lead.lead_name}",
            type="interested_request",
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
                "related_task_id": str(notification.related_task_id) if notification.related_task_id else None,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
            },
        }

        background_tasks.add_task(
            send_notification_sync,
            str(recipient.id),
            notification_payload,
        )

    logger.info(f"Interested request created for lead {lead_id} by user {current_user.id}")

    return LeadInterestedRequestResponse.model_validate(interested_request)


@router.get("/interested-requests/pending", response_model=List[LeadInterestedRequestResponse])
def list_pending_interested_requests(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    return [
        LeadInterestedRequestResponse.model_validate(request)
        for request in db.query(LeadInterestedRequest)
        .filter(LeadInterestedRequest.status == "pending")
        .order_by(LeadInterestedRequest.created_at.desc())
        .all()
    ]


@router.post("/takeover-requests/{request_id}/review")
def review_takeover_request(
    request_id: int,
    payload: ApprovalReviewPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    request = db.query(LeadTakeoverRequest).filter(LeadTakeoverRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Takeover request not found")
    if payload.decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Decision must be approved or rejected")
    request.status = payload.decision
    request.review_comment = payload.review_comment
    request.reviewer_id = current_user.id
    request.reviewer_name = getattr(current_user, "full_name", None) or current_user.email
    # local import to ensure datetime name resolves correctly in all runtimes
    from datetime import datetime as _dt
    request.reviewed_at = _dt.utcnow()
    db.commit()
    return {"status": request.status, "request_id": request.id}


@router.post("/interested-requests/{request_id}/review")
def review_interested_request(
    request_id: int,
    payload: ApprovalReviewPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    request = db.query(LeadInterestedRequest).filter(LeadInterestedRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Interest request not found")
    if payload.decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Decision must be approved or rejected")
    request.status = payload.decision
    request.review_comment = payload.review_comment
    request.reviewer_id = current_user.id
    request.reviewer_name = getattr(current_user, "full_name", None) or current_user.email
    # local import to ensure datetime name resolves correctly in all runtimes
    from datetime import datetime as _dt
    request.reviewed_at = _dt.utcnow()
    db.commit()
    return {"status": request.status, "request_id": request.id}


def map_csv_row_to_lead(row: dict) -> Optional[dict]:
    """Map CSV row to lead payload"""
    try:
        # Try to parse JSON data from the 'data' column if present
        data = {}
        if row.get('data'):
            try:
                decoded_data = html.unescape(row.get('data', '{}'))
                if decoded_data.startswith('"') and decoded_data.endswith('"'):
                    decoded_data = decoded_data[1:-1]
                data = json.loads(decoded_data)
            except Exception:
                pass
        
        # Get lead name - try multiple sources
        lead_name = (
            data.get('contactPerson') or 
            row.get('lead_name') or 
            row.get('contact_person') or 
            row.get('name') or 
            'Unknown Lead'
        )
        
        # Get company name - try multiple sources
        company_name = (
            data.get('companyName') or 
            row.get('company_name') or 
            row.get('company') or 
            ''
        )
        
        # Skip if lead name is still "Unknown Lead" or empty
        if lead_name == 'Unknown Lead' or not lead_name or lead_name.strip() == '':
            return None
        
        payload = {
            "lead_name": lead_name,
            "company_name": company_name,
            "mobile": data.get('contactNumber') or row.get('mobile') or row.get('phone') or '',
            "alternate_mobile": row.get('alternate_mobile') or '',
            "email": data.get('emailId') or row.get('email') or '',
            "company_email": row.get('company_email') or '',
            "city": data.get('location') or row.get('city') or '',
            "state": row.get('state') or '',
            "product_type": data.get('productDiscussed') or row.get('product_type') or '',
            "funding_amount": None,
            "lead_source": data.get('leadSource') or row.get('lead_source') or '',
            "lead_status": data.get('currentStatus') or row.get('lead_status') or 'New',
            "assigned_to": None,
            "remarks": data.get('learningChallenge') or row.get('remarks') or ''
        }
        
        return payload
    except Exception as e:
        logger.error(f"Error mapping CSV row: {e}")
        return None


@router.post("/{lead_id}/deal-steps")
def save_deal_step(lead_id: int, payload: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Save a step payload for a lead. Payload format: { "step": 1, "data": { ... } }

    This will merge the provided data into the lead's `lender_related_detail` JSON blob
    field so frontend deal step data can be persisted without adding a new table.
    """
    try:
                from ..models.lead import Lead
                from sqlalchemy import select, update

                # Read only the lender_related_detail column to avoid selecting full model
                row = db.execute(select(Lead.lender_related_detail).where(Lead.id == lead_id)).scalar_one_or_none()
                if row is None:
                    # Lead not found
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

                existing_text = row or ""
                try:
                    existing = json.loads(existing_text) if existing_text else {}
                except Exception:
                    existing = {}

                step_key = f"step_{int(payload.get('step') or 0)}"
                data = payload.get('data') or {}

                existing[step_key] = data

                # Perform an UPDATE that touches only the lender_related_detail (and updated_at)
                db.execute(
                    update(Lead)
                    .where(Lead.id == lead_id)
                    .values(lender_related_detail=json.dumps(existing), updated_at=datetime.datetime.utcnow())
                )
                db.commit()

                return {"status": "ok", "lead_id": lead_id, "stored_step": step_key}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to save deal step")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-duplicates")
def check_duplicates(
    payload: LeadDuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Check for duplicate leads based on Company Name / Mobile Number / Email
    Returns duplicate information if found, otherwise returns no duplicate
    """
    logger.info(f"POST /leads/check-duplicates - Checking duplicates for: {payload.company_name}, {payload.mobile}, {payload.email}")
    
    try:
        query = db.query(Lead)
        
        # Check for duplicates using AND logic for provided fields
        conditions = []
        if payload.company_name:
            conditions.append(Lead.company_name == payload.company_name)
        if payload.mobile:
            conditions.append(Lead.mobile == payload.mobile)
        if payload.email:
            conditions.append(Lead.email == payload.email)

        if conditions:
            query = query.filter(and_(*conditions))
            existing_leads = query.order_by(Lead.created_at.desc()).all()
            if existing_leads:
                logger.info(f"Found {len(existing_leads)} duplicate leads")
                duplicate_lead = existing_leads[0]
                duplicate_data = serialize_lead_with_mode_info(duplicate_lead)

                # Add owner_name helper field for client convenience
                owner_name = None
                if duplicate_lead.assigned_to:
                    from .users import get_user_by_id
                    owner = get_user_by_id(db, duplicate_lead.assigned_to)
                    if owner:
                        owner_name = owner.name or owner.email

                duplicate_data["owner_name"] = owner_name

                return {
                    "duplicate": True,
                    "existing_lead": duplicate_data
                }
        
        logger.info("No duplicates found")
        return {"duplicate": False, "existing_lead": None}
        
    except Exception as e:
        logger.error(f"Error checking duplicates: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error checking duplicates: {str(e)}")
    finally:
        db.close()


@router.get("/search")
def search_leads(
    company_name: Optional[str] = Query(None),
    mobile: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Search for leads by company_name, mobile, and email.
    Uses strict AND matching for provided fields and returns computed ownership metadata.
    """
    logger.info(f"GET /leads/search - Searching for duplicates: {company_name}, {mobile}, {email}")

    if not any([company_name, mobile, email]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one search parameter is required")

    query = db.query(Lead)
    conditions = []
    if company_name:
        conditions.append(Lead.company_name == company_name)
    if mobile:
        conditions.append(Lead.mobile == mobile)
    if email:
        conditions.append(Lead.email == email)

    if not conditions:
        return {"duplicate": False, "existing_lead": None}

    query = query.filter(and_(*conditions))
    duplicate_lead = query.order_by(Lead.created_at.desc()).first()
    if duplicate_lead:
        return {
            "duplicate": True,
            "existing_lead": serialize_lead_with_mode_info(duplicate_lead)
        }

    return {"duplicate": False, "existing_lead": None}


@router.get("/{lead_id}/check-stage-lock")
def check_stage_lock(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Check if a lead's form should be locked based on stage change rules.
    A form should be locked if the 1st person's stage changed within 2-30 days.
    It remains unlocked only if the stage remains unchanged after 30 days.
    """
    from datetime import datetime, timedelta
    
    logger.info(f"GET /leads/{lead_id}/check-stage-lock - Checking stage lock status")
    
    try:
        lead = get_lead_by_id(db, lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # If no stage change date exists, form is not locked
        if not lead.last_stage_change_date:
            return {
                "is_locked": False,
                "reason": "No stage change recorded",
                "last_stage_change_date": None,
                "days_since_change": None
            }
        
        # Calculate days since last stage change
        now = datetime.utcnow()
        days_since_change = (now - lead.last_stage_change_date).days
        
        # Lock if stage changed within 2-30 days
        if 2 <= days_since_change <= 30:
            return {
                "is_locked": True,
                "reason": f"Stage changed {days_since_change} days ago (within 2-30 day window)",
                "last_stage_change_date": lead.last_stage_change_date.isoformat(),
                "days_since_change": days_since_change
            }
        
        # Unlock if stage changed more than 30 days ago
        if days_since_change > 30:
            return {
                "is_locked": False,
                "reason": f"Stage changed {days_since_change} days ago (beyond 30-day window)",
                "last_stage_change_date": lead.last_stage_change_date.isoformat(),
                "days_since_change": days_since_change
            }
        
        # Stage changed less than 2 days ago - not locked yet
        return {
            "is_locked": False,
            "reason": f"Stage changed {days_since_change} days ago (within 2-day grace period)",
            "last_stage_change_date": lead.last_stage_change_date.isoformat(),
            "days_since_change": days_since_change
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking stage lock: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking stage lock: {str(e)}")


@router.post("/{lead_id}/transfer-ownership")
def transfer_ownership(
    lead_id: int,
    payload: OwnershipTransferRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Transfer ownership of a lead to another user
    Records the transfer in ownership history
    """
    from .services.ownership_service import OwnershipService
    
    logger.info(f"POST /leads/{lead_id}/transfer-ownership - Transferring ownership to {payload.new_owner_id}")
    
    try:
        # Check eligibility
        eligibility = OwnershipService.check_ownership_eligibility(lead_id, str(current_user.id), db)
        
        if not eligibility["eligible"]:
            raise HTTPException(
                status_code=403,
                detail=f"Ownership transfer not allowed: {eligibility['reason']}"
            )
        
        # Perform transfer
        ownership_history = OwnershipService.transfer_ownership(
            lead_id=lead_id,
            new_owner_id=str(payload.new_owner_id),
            transfer_reason=payload.transfer_reason,
            db=db,
            current_user_id=str(current_user.id)
        )
        
        logger.info(f"Ownership transferred successfully for lead {lead_id}")
        
        return {
            "message": "Ownership transferred successfully",
            "ownership_history": {
                "id": ownership_history.id,
                "previous_owner": ownership_history.previous_owner_name,
                "new_owner": ownership_history.new_owner_name,
                "transfer_reason": ownership_history.transfer_reason,
                "transfer_date": ownership_history.transfer_date.isoformat(),
                "days_inactive": ownership_history.days_inactive
            }
        }
        
    except ValueError as e:
        logger.error(f"Ownership transfer error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error transferring ownership: {e}")
        raise HTTPException(status_code=500, detail=f"Error transferring ownership: {str(e)}")


@router.get("/{lead_id}/ownership-history")
def get_ownership_history(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get complete ownership history for a lead
    """
    from .services.ownership_service import OwnershipService
    
    logger.info(f"GET /leads/{lead_id}/ownership-history - Getting ownership history")
    
    try:
        history = OwnershipService.get_lead_ownership_history(lead_id, db)
        
        return {
            "lead_id": lead_id,
            "ownership_history": history
        }
        
    except Exception as e:
        logger.error(f"Error getting ownership history: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting ownership history: {str(e)}")


@router.get("/{lead_id}/permissions")
def get_user_permissions(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Check what permissions the current user has for a lead
    """
    from .services.ownership_service import OwnershipService
    
    logger.info(f"GET /leads/{lead_id}/permissions - Checking user permissions")
    
    try:
        permissions = OwnershipService.check_user_permissions(
            lead_id=lead_id,
            user_id=str(current_user.id),
            db=db
        )
        
        return permissions
        
    except Exception as e:
        logger.error(f"Error checking permissions: {e}")
        raise HTTPException(status_code=500, detail=f"Error checking permissions: {str(e)}")


@router.post("/import/csv")
async def import_leads_csv(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),  # Changed from require_manager_or_admin to get_current_user for testing
):
    """Import leads from CSV file"""
    logger.info(f"CSV import attempt by user: {current_user.id}, role: {current_user.role}")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    imported_count = 0
    failed_count = 0
    errors = []
    imported_leads = []
    
    try:
        # Read CSV content
        content = await file.read()
        
        # Try different encodings
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                csv_content = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Could not decode CSV file. Try saving as UTF-8.")
        
        # Detect delimiter (comma or semicolon)
        sample = csv_content[:1000]
        delimiter = ';' if sample.count(';') > sample.count(',') else ','
        
        # Parse CSV
        csv_reader = csv.DictReader(io.StringIO(csv_content), delimiter=delimiter)
        
        for row_num, row in enumerate(csv_reader, start=1):
            try:
                payload = map_csv_row_to_lead(row)
                if not payload:
                    failed_count += 1
                    errors.append(f"Row {row_num}: Skipped - invalid or empty data")
                    continue
                
                # Create lead
                lead_create = LeadCreate(**payload)
                lead = create_lead(db, lead_create, creator_id=current_user.id)
                imported_count += 1
                imported_leads.append(lead)
                
                logger.info(f"Imported lead: {lead.lead_name} (Row {row_num})")
                
            except Exception as e:
                failed_count += 1
                errors.append(f"Row {row_num}: {str(e)}")
                logger.error(f"Failed to import row {row_num}: {e}")
        
        # Broadcast sync event for each imported lead
        for lead in imported_leads:
            lead_response = LeadResponse.model_validate(lead)
            background_tasks.add_task(
                broadcast_data_sync_sync,
                'lead',
                'create',
                lead_response.model_dump()
            )
        
        return {
            "imported": imported_count,
            "failed": failed_count,
            "errors": errors[:10]  # Return first 10 errors
        }
        
    except Exception as e:
        logger.error(f"CSV import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
