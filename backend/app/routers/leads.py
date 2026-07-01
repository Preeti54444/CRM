import logging
import csv
import io
import html
import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status, UploadFile, File
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
    current_user=Depends(get_current_user),
):
    logger.info(f"POST /leads - Payload received: {payload.dict()}")
    logger.info(f"POST /leads - Payload JSON: {payload.model_dump_json()}")
    logger.info(f"POST /leads - Current user ID: {current_user.id}, email: {current_user.email}")
    
    try:
        creator_id = current_user.id
        creator_name = getattr(current_user, "full_name", None) or current_user.email
        
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
    
    return {"items": items, "total": total}


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
    
    return {"items": new_leads, "total": new_total}


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
    
    return {"items": call_leads, "total": call_total}


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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead = assign_lead(db, lead, assignee_id)
    
    # Broadcast data sync event for real-time updates
    lead_response = LeadResponse.model_validate(lead)
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'lead',
        'update',
        lead_response.model_dump()
    )
    
    return lead


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
