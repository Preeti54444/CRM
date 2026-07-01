import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.lead import Lead
from ..models.user import User
from ..schemas.lead import LeadCreate, LeadUpdate
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event
from ..services.notification_service import create_notification
from ..services.user_service import get_user_by_id

logger = logging.getLogger(__name__)


def create_lead(db: Session, lead_in: LeadCreate, creator_id: Optional[UUID] = None) -> Lead:
    logger.info(f"Creating lead with payload: {lead_in.model_dump()}")
    logger.info(f"Creator ID: {creator_id}")

    if creator_id is not None:
        creator = get_user_by_id(db, creator_id)
        if creator is None:
            logger.error(f"Creator user not found: {creator_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Creator user does not exist.",
            )

    if lead_in.assigned_to is not None:
        assignee = get_user_by_id(db, lead_in.assigned_to)
        if assignee is None:
            logger.error(f"Assigned user not found: {lead_in.assigned_to}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user does not exist.",
            )

    new_lead = Lead(
        lead_name=lead_in.lead_name,
        company_name=lead_in.company_name,
        mobile=lead_in.mobile,
        alternate_mobile=lead_in.alternate_mobile,
        email=lead_in.email,
        company_email=lead_in.company_email,
        city=lead_in.city,
        state=lead_in.state,
        product_type=lead_in.product_type,
        funding_amount=lead_in.funding_amount,
        lead_source=lead_in.lead_source,
        lead_status=lead_in.lead_status,
        assigned_to=lead_in.assigned_to,
        remarks=lead_in.remarks,
        created_by=creator_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_lead)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        logger.exception("Lead creation failed due to database integrity error")
        if "users" in str(exc.orig).lower() or "foreign key" in str(exc.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user or creator user does not exist.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create lead due to invalid data.",
        ) from exc

    db.refresh(new_lead)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=new_lead.id,
            event_type="Lead Created",
            description=f"Lead '{new_lead.lead_name}' was created.",
        ),
        creator_id=creator_id,
    )
    return new_lead


def get_lead_by_id(db: Session, lead_id: int | str) -> Optional[Lead]:
    if isinstance(lead_id, str):
        try:
            lead_id = int(lead_id)
        except ValueError:
            return None
    return db.query(Lead).filter(Lead.id == lead_id).first()


def get_leads(db: Session, skip: int = 0, limit: int = 50, search: Optional[str] = None, filters: dict | None = None, user_id: Optional[UUID] = None, user_role: Optional[str] = None):
    from ..models.user import User
    from ..models.call import Call
    from ..models.followup import FollowUp
    from sqlalchemy import or_
    from sqlalchemy import text
    
    q = db.query(Lead)
    
    # DEBUG: Log initial query and check for "undefined" strings
    logger.info(f"[AUDIT] get_leads called with: skip={skip}, limit={limit}, search={search}, filters={filters}, user_id={user_id}, user_role={user_role}")
    
    # Check if search is the literal string "undefined"
    if search == "undefined":
        logger.warning("[AUDIT] search parameter is literal string 'undefined', treating as None")
        search = None
    
    # Check filters for "undefined" strings
    if filters:
        for key, value in filters.items():
            if value == "undefined":
                logger.warning(f"[AUDIT] filter '{key}' is literal string 'undefined', treating as None")
                filters[key] = None
    
    # Log total rows in PostgreSQL before any filtering
    total_in_db = db.query(Lead).count()
    logger.info(f"[AUDIT] Total rows in PostgreSQL leads table: {total_in_db}")
    
    if search:
        like = f"%{search}%"
        # Join with users table to search by executive name
        q = q.outerjoin(User, Lead.assigned_to == User.id)
        q = q.filter(
            or_(
                Lead.lead_name.ilike(like),
                Lead.company_name.ilike(like),
                Lead.mobile.ilike(like),
                Lead.email.ilike(like),
                User.full_name.ilike(like)
            )
        )
        logger.info(f"[AUDIT] Applied search filter: {search}")
    
    # Apply filters
    if filters:
        if "lead_status" in filters and filters["lead_status"] is not None:
            q = q.filter(Lead.lead_status == filters["lead_status"])
            logger.info(f"[AUDIT] Applied lead_status filter: {filters['lead_status']}")
        if "assigned_to" in filters and filters["assigned_to"] is not None:
            q = q.filter(Lead.assigned_to == filters["assigned_to"])
            logger.info(f"[AUDIT] Applied assigned_to filter: {filters['assigned_to']}")
    
    # Check for additional filters that might be causing issues
    # The Lead model doesn't have these fields, but log if they're being passed
    if filters:
        for key in ["status", "company_id", "employee_id", "deleted", "is_active", "tenant_id"]:
            if key in filters:
                logger.warning(f"[AUDIT] Filter '{key}' provided but not present in Lead model - this will cause errors")
    
    # For non-admin users, automatically filter by assigned_to if not explicitly provided
    # Admins and managers see all leads unless they specifically filter
    # TEMPORARY: Disable automatic filtering to allow all users to see all leads for debugging
    # This will be re-enabled once the filtering logic is verified
    if False and user_role and user_role not in ["admin", "manager"] and user_id:
        # Only apply automatic filter if assigned_to is not already in filters
        if not filters or "assigned_to" not in filters:
            q = q.filter(Lead.assigned_to == user_id)
            logger.info(f"Auto-filtering leads for user {user_id} (role: {user_role}) to show only assigned leads")
    
    # DEBUG: Log query before execution
    from sqlalchemy.dialects import postgresql
    compiled_query = q.statement.compile(dialect=postgresql.dialect())
    logger.info(f"[AUDIT] SQL Query: {compiled_query}")
    
    total = q.count()
    logger.info(f"[AUDIT] Total leads after filtering (before pagination): {total}")
    
    items = q.offset(skip).limit(limit).all()
    logger.info(f"[AUDIT] Leads returned after pagination: {len(items)}")
    
    # Log rows before serialization
    logger.info(f"[AUDIT] Rows returned before serialization: {len(items)}")
    
    # Add user names and activity classification to each lead for display
    for lead in items:
        if lead.assigned_to:
            assigned_user = db.query(User).filter(User.id == lead.assigned_to).first()
            lead.assigned_user_name = assigned_user.full_name if assigned_user else None
        if lead.created_by:
            created_user = db.query(User).filter(User.id == lead.created_by).first()
            lead.created_by_name = created_user.full_name if created_user else None
        
        # Check for call activity
        has_call = db.query(Call).filter(Call.lead_id == lead.id).first()
        lead.has_call_activity = has_call is not None
        if has_call:
            lead.last_call_date = db.query(func.max(Call.call_date)).filter(Call.lead_id == lead.id).scalar()
        
        # Check for follow-up activity
        has_followup = db.query(FollowUp).filter(FollowUp.lead_id == lead.id).first()
        lead.has_followup = has_followup is not None
        if has_followup:
            lead.last_followup_date = db.query(func.max(FollowUp.followup_date)).filter(FollowUp.lead_id == lead.id).scalar()
        
        # Classify lead: New (no activity) vs Call Management (has activity)
        lead.lead_classification = "Call Management" if (lead.has_call_activity or lead.has_followup) else "New"
    
    logger.info(f"[AUDIT] Rows returned after serialization: {len(items)}")
    return items, total


def update_lead(db: Session, lead: Lead, lead_in: LeadUpdate, updater_id: Optional[UUID] = None) -> Lead:
    changes = []
    for field, value in lead_in.__dict__.items():
        if value is not None and getattr(lead, field) != value:
            changes.append(f"{field} updated")
            setattr(lead, field, value)
    lead.updated_at = datetime.utcnow()
    db.add(lead)
    db.commit()
    db.refresh(lead)
    if changes:
        add_timeline_event(
            db,
            TimelineEventCreate(
                lead_id=lead.id,
                event_type="Lead Updated",
                description="; ".join(changes),
            ),
            creator_id=updater_id,
        )
    return lead


def delete_lead(db: Session, lead: Lead) -> None:
    db.delete(lead)
    db.commit()


def assign_lead(db: Session, lead: Lead, user_id: UUID, assigner_id: Optional[UUID] = None) -> Lead:
    previous_assignee = lead.assigned_to
    lead.assigned_to = user_id
    lead.updated_at = datetime.utcnow()
    db.add(lead)
    db.commit()
    db.refresh(lead)
    event_type = "Lead Assigned" if previous_assignee is None else "Lead Reassigned"
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=lead.id,
            event_type=event_type,
            description=f"Lead assigned to user {user_id}.",
        ),
        creator_id=assigner_id,
    )
    if user_id is not None:
        create_notification(
            db,
            user_id,
            title="Lead Assignment",
            message=f"You have been assigned to lead {lead.id}: {lead.lead_name}.",
        )
    return lead
