import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.lead import Lead
from ..models.user import User
from ..models.contact import Contact
from uuid import uuid4
from ..schemas.lead import LeadCreate, LeadUpdate
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event
from ..services.notification_service import create_notification
from ..services.user_service import get_user_by_id
from .performance_calculation_service import PerformanceCalculationService

logger = logging.getLogger(__name__)


def _should_sync_deal_forecast(lead: Lead) -> bool:
    stage_name = (lead.pipeline_stage or lead.lead_status or "").strip().lower()
    if not stage_name:
        return False
    if lead.deal_value or lead.funding_amount:
        return True
    return any(token in stage_name for token in ["login", "sanction", "disburse", "proposal", "credit", "documentation", "bank"])


def _sync_deal_forecast_snapshot(db: Session, lead: Lead) -> None:
    from .forecast_service import ForecastCalculationEngine

    if not _should_sync_deal_forecast(lead):
        return

    try:
        engine = ForecastCalculationEngine(db)
        stage_name = lead.pipeline_stage or lead.lead_status or "New Leads"
        loan_amount = lead.deal_value or lead.funding_amount or 0
        engine.create_forecast_snapshot(
            lead_id=lead.id,
            lead=lead,
            current_stage=stage_name,
            loan_amount=Decimal(str(loan_amount or 0)),
            rm_id=str(lead.assigned_to) if lead.assigned_to else None,
            rm_name=None,
        )
    except Exception as exc:
        logger.warning("Deal forecast snapshot sync failed for lead %s: %s", lead.id, exc)


def create_lead(db: Session, lead_in: LeadCreate, creator_id: Optional[UUID] = None) -> Lead:
    from .pipeline_transition_service import PipelineTransitionService
    
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

    # Get initial pipeline stage based on lead status
    initial_pipeline_stage = PipelineTransitionService.get_pipeline_stage_for_status(
        db, lead_in.lead_status or "New"
    )

    new_lead = Lead(
        lead_name=lead_in.lead_name,
        company_name=lead_in.company_name,
        designation=lead_in.designation,
        mobile=lead_in.mobile,
        alternate_mobile=lead_in.alternate_mobile,
        email=lead_in.email,
        company_email=lead_in.company_email,
        city=lead_in.city,
        state=lead_in.state,
        product_type=lead_in.product_type,
        vertical=lead_in.vertical,
        sub_product=lead_in.sub_product,
        funding_amount=lead_in.funding_amount,
        lead_source=lead_in.lead_source,
        credit_rating=lead_in.credit_rating,
        rating_date=lead_in.rating_date,
        rating_agency=lead_in.rating_agency,
        lender_related_detail=lead_in.lender_related_detail,
        lead_status=lead_in.lead_status,
        pipeline_stage=initial_pipeline_stage,
        assigned_to=lead_in.assigned_to,
        remarks=lead_in.remarks,
        followup_date=lead_in.followup_date,
        deal_value=lead_in.deal_value,
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
    _sync_deal_forecast_snapshot(db, new_lead)
    add_timeline_event(
        db,
        TimelineEventCreate(
            lead_id=new_lead.id,
            event_type="Lead Created",
            description=f"Lead '{new_lead.lead_name}' was created and placed in '{initial_pipeline_stage}' stage.",
        ),
        creator_id=creator_id,
    )
    
    # Trigger performance recalculation for the employee
    try:
        if creator_id:
            employee = get_user_by_id(db, creator_id)
            if employee and str(employee.role).lower() == "employee":
                PerformanceCalculationService.calculate_daily_performance(
                    db, creator_id, employee.full_name
                )
                from .target_engine_service import TargetEngineService
                qualified_statuses = ["qualified", "warm", "hot", "interested"]
                if new_lead.lead_status and new_lead.lead_status.lower() in qualified_statuses:
                    TargetEngineService.on_lead_added(db, creator_id, employee.full_name, str(new_lead.id))
    except Exception as e:
        logger.error(f"Error triggering performance recalculation: {e}")
    
    # Create a Contact record for this lead's primary contact details
    try:
        contact = Contact(
            contact_id=f"c-{uuid4().hex}",
            contact_name=new_lead.lead_name,
            designation=new_lead.designation,
            phone=new_lead.mobile,
            alternate_phone=new_lead.alternate_mobile,
            email=new_lead.email,
            alternate_email=None,
            company_name=new_lead.company_name,
            lead_id=new_lead.id,
            created_by=creator_id,
            contact_status="Active",
        )
        db.add(contact)
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Failed to create Contact for lead {new_lead.id}: {e}")

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
    
    # Sales users can see only leads they created or currently own.
    full_access_roles = {"admin", "branch_manager", "manager", "sales_manager"}
    normalized_role = str(user_role or "").strip().lower()
    if user_id and normalized_role not in full_access_roles:
        q = q.filter(or_(Lead.created_by == user_id, Lead.assigned_to == user_id))
        logger.info(f"Auto-filtering leads for user {user_id} (role: {normalized_role}) to owned leads")
    
    # DEBUG: Log query before execution
    from sqlalchemy.dialects import postgresql
    compiled_query = q.statement.compile(dialect=postgresql.dialect())
    logger.debug(f"[AUDIT] SQL Query: {compiled_query}")
    
    total = q.count()
    logger.info(f"[AUDIT] Total leads after filtering (before pagination): {total}")
    
    items = q.offset(skip).limit(limit).all()
    logger.info(f"[AUDIT] Leads returned after pagination: {len(items)}")
    
    # Log rows before serialization
    logger.debug(f"[AUDIT] Rows returned before serialization: {len(items)}")
    
    lead_ids = [lead.id for lead in items if getattr(lead, "id", None) is not None]

    user_lookup = {}
    assigned_user_ids = {lead.assigned_to for lead in items if getattr(lead, "assigned_to", None) is not None}
    if assigned_user_ids:
        assigned_users = db.query(User.id, User.full_name).filter(User.id.in_(assigned_user_ids)).all()
        user_lookup.update({user.id: user.full_name for user in assigned_users})

    created_user_ids = {lead.created_by for lead in items if getattr(lead, "created_by", None) is not None}
    if created_user_ids:
        created_users = db.query(User.id, User.full_name).filter(User.id.in_(created_user_ids)).all()
        created_user_lookup = {user.id: user.full_name for user in created_users}
    else:
        created_user_lookup = {}

    call_activity_map = {}
    followup_activity_map = {}
    if lead_ids:
        call_rows = (
            db.query(Call.lead_id, func.max(Call.call_date).label("last_call_date"))
            .filter(Call.lead_id.in_(lead_ids))
            .group_by(Call.lead_id)
            .all()
        )
        call_activity_map = {row.lead_id: row.last_call_date for row in call_rows}

        followup_rows = (
            db.query(FollowUp.lead_id, func.max(FollowUp.followup_date).label("last_followup_date"))
            .filter(FollowUp.lead_id.in_(lead_ids))
            .group_by(FollowUp.lead_id)
            .all()
        )
        followup_activity_map = {row.lead_id: row.last_followup_date for row in followup_rows}

    # Add user names and activity classification to each lead for display
    for lead in items:
        if lead.assigned_to:
            lead.assigned_user_name = user_lookup.get(lead.assigned_to)
        if lead.created_by:
            lead.created_by_name = created_user_lookup.get(lead.created_by)

        lead.has_call_activity = lead.id in call_activity_map
        if lead.has_call_activity:
            lead.last_call_date = call_activity_map.get(lead.id)

        lead.has_followup = lead.id in followup_activity_map
        if lead.has_followup:
            lead.last_followup_date = followup_activity_map.get(lead.id)

        # Classify lead: New (no activity) vs Call Management (has activity)
        lead.lead_classification = "Call Management" if (lead.has_call_activity or lead.has_followup) else "New"
    
    logger.debug(f"[AUDIT] Rows returned after serialization: {len(items)}")
    return items, total


def update_lead(db: Session, lead: Lead, lead_in: LeadUpdate, updater_id: Optional[UUID] = None, background_tasks=None) -> Lead:
    from .pipeline_transition_service import PipelineTransitionService
    
    changes = []
    status_changed = False
    
    # Check if status is being changed
    if lead_in.lead_status is not None and lead.lead_status != lead_in.lead_status:
        status_changed = True
        previous_status = lead.lead_status
        new_status = lead_in.lead_status
        # Update last_stage_change_date when status changes
        lead.last_stage_change_date = datetime.utcnow()
    
    # Update other fields
    for field, value in lead_in.__dict__.items():
        if value is not None and getattr(lead, field) != value:
            changes.append(f"{field} updated")
            setattr(lead, field, value)
    
    # If status changed, use PipelineTransitionService for automatic pipeline movement
    if status_changed and updater_id:
        try:
            lead = PipelineTransitionService.handle_status_change(
                db, lead, new_status, updater_id, remarks=lead_in.remarks, background_tasks=background_tasks
            )
            return lead
        except Exception as e:
            logger.error(f"Error in pipeline transition service: {e}")
            # Fall back to manual update if service fails
            raise
    
    # Standard update for non-status changes or if updater_id is not provided
    lead.updated_at = datetime.utcnow()
    db.add(lead)
    db.commit()
    db.refresh(lead)
    _sync_deal_forecast_snapshot(db, lead)
    
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
        try:
            owner_id = lead.created_by or updater_id
            if owner_id:
                employee = get_user_by_id(db, owner_id)
                if employee and str(employee.role).lower() == "employee":
                    PerformanceCalculationService.calculate_daily_performance(
                        db, owner_id, employee.full_name
                    )
                    qualified_statuses = ["qualified", "warm", "hot", "interested"]
                    if lead.lead_status and lead.lead_status.lower() in qualified_statuses:
                        from .target_engine_service import TargetEngineService
                        TargetEngineService.on_lead_added(db, owner_id, employee.full_name, str(lead.id))
        except Exception as e:
            logger.error(f"Error triggering performance recalculation on lead update: {e}")
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
