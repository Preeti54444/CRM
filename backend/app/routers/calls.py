from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas import CallCreate, CallResponse, CallUpdate
from ..services.call_service import (
    create_call,
    get_call_by_id,
    get_calls,
    update_call,
    delete_call,
)
from ..services.websocket_notification_service import broadcast_data_sync_sync

router = APIRouter(prefix="/calls", tags=["calls"])


@router.post("", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
def create_call_endpoint(
    payload: CallCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    creator_id = current_user.id
    call = create_call(db, payload, creator_id=creator_id)
    
    # Broadcast data sync event for real-time updates
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'call',
        'create',
        {
            'id': call.id,
            'call_id': call.call_id,
            'call_type': call.call_type,
            'call_date': call.call_date.isoformat() if call.call_date else None,
            'call_time': call.call_time.isoformat() if call.call_time else None,
            'duration_seconds': call.duration_seconds,
            'caller_name': call.caller_name,
            'caller_phone': call.caller_phone,
            'receiver_name': call.receiver_name,
            'receiver_phone': call.receiver_phone,
            'receiver_email': call.receiver_email,
            'lead_id': call.lead_id,
            'purpose': call.purpose,
            'description': call.description,
            'status': call.status,
            'priority': call.priority,
            'outcome': call.outcome,
            'followup_required': call.followup_required,
            'followup_date': call.followup_date.isoformat() if call.followup_date else None,
            'followup_notes': call.followup_notes,
            'recording_link': call.recording_link,
            'sale_executive': call.sale_executive,
            'product': call.product,
            'source': call.source,
            'customer_company_name': call.customer_company_name,
            'contact_person_name': call.contact_person_name,
            'designation': call.designation,
            'action': call.action,
            'notes': call.notes,
            'created_by': str(call.created_by),
            'created_at': call.created_at.isoformat() if call.created_at else None,
            'updated_at': call.updated_at.isoformat() if call.updated_at else None,
        }
    )
    
    return call


@router.get("", response_model=List[CallResponse])
def list_calls(
    skip: int = 0,
    limit: int = 25,
    search: Optional[str] = Query(None),
    call_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    lead_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        filters = {}
        if call_type:
            filters["call_type"] = call_type
        if status:
            filters["status"] = status
        if lead_id:
            filters["lead_id"] = lead_id
        
        # Role-based filtering
        if current_user.role == "employee":
            # Employees only see calls they created
            filters["created_by"] = current_user.id
        elif current_user.role == "manager":
            # Managers see calls from their team (same department/organization)
            # For now, show all calls - can be refined based on team structure
            pass
        # Admins see all calls (no filtering)
        
        items, total = get_calls(db, skip=skip, limit=limit, search=search, filters=filters)
        return items
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching calls: {str(e)}"
        )


@router.get("/{call_id}", response_model=CallResponse)
def get_call(call_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    call = get_call_by_id(db, call_id)
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    return call


@router.put("/{call_id}", response_model=CallResponse)
def update_call_endpoint(
    call_id: int,
    payload: CallUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    call = get_call_by_id(db, call_id)
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    call = update_call(db, call, payload)
    
    # Broadcast data sync event for real-time updates
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'call',
        'update',
        {
            'id': call.id,
            'call_id': call.call_id,
            'call_type': call.call_type,
            'call_date': call.call_date.isoformat() if call.call_date else None,
            'call_time': call.call_time.isoformat() if call.call_time else None,
            'duration_seconds': call.duration_seconds,
            'caller_name': call.caller_name,
            'caller_phone': call.caller_phone,
            'receiver_name': call.receiver_name,
            'receiver_phone': call.receiver_phone,
            'receiver_email': call.receiver_email,
            'lead_id': call.lead_id,
            'purpose': call.purpose,
            'description': call.description,
            'status': call.status,
            'priority': call.priority,
            'outcome': call.outcome,
            'followup_required': call.followup_required,
            'followup_date': call.followup_date.isoformat() if call.followup_date else None,
            'followup_notes': call.followup_notes,
            'recording_link': call.recording_link,
            'sale_executive': call.sale_executive,
            'product': call.product,
            'source': call.source,
            'customer_company_name': call.customer_company_name,
            'contact_person_name': call.contact_person_name,
            'designation': call.designation,
            'action': call.action,
            'notes': call.notes,
            'created_by': str(call.created_by),
            'created_at': call.created_at.isoformat() if call.created_at else None,
            'updated_at': call.updated_at.isoformat() if call.updated_at else None,
        }
    )
    
    return call


@router.delete("/{call_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_call_endpoint(
    call_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    call = get_call_by_id(db, call_id)
    if not call:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
    
    # Broadcast data sync event before deletion
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'call',
        'delete',
        {'id': call_id}
    )
    
    delete_call(db, call)
    return None


@router.post("/sync")
def sync_calls(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Sync multiple calls from frontend to backend"""
    items = payload.get('items', [])
    if not isinstance(items, list):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Items must be a list")
    
    synced = []
    for item in items:
        try:
            # Check if call exists by call_id
            existing = db.query(Call).filter(Call.call_id == item.get('call_id')).first()
            
            if existing:
                # Update existing call
                for field, value in item.items():
                    if value is not None and hasattr(existing, field):
                        setattr(existing, field, value)
                existing.updated_at = datetime.utcnow()
                db.add(existing)
                synced.append(existing.id)
            else:
                # Create new call
                call_data = CallCreate(**item)
                new_call = create_call(db, call_data, creator_id=current_user.id)
                synced.append(new_call.id)
        except Exception as e:
            print(f"Error syncing call {item.get('call_id')}: {e}")
            continue
    
    db.commit()
    return {"synced": len(synced), "ids": synced}
