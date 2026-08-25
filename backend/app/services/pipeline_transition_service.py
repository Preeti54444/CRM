"""Pipeline Transition Service for Automatic Lead Pipeline Movement"""
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, List
from uuid import UUID

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from ..models.lead import Lead
from ..models.pipeline_configuration import PipelineConfiguration
from ..models.pipeline_transition_audit import PipelineTransitionAudit
from ..models.user import User
from ..schemas.timeline import TimelineEventCreate
from ..services.timeline_service import add_timeline_event
from ..services.notification_service import create_notification
from ..services.websocket_notification_service import send_notification_sync, broadcast_data_sync_sync
from .performance_calculation_service import PerformanceCalculationService
from .target_engine_service import TargetEngineService

logger = logging.getLogger(__name__)


class PipelineTransitionService:
    """Centralized service for handling automatic pipeline movement based on lead status changes"""
    
    # Default status-to-pipeline mapping (used as fallback)
    DEFAULT_STATUS_TO_PIPELINE = {
        "new": "New Leads",
        "new lead": "New Leads",
        "contacted": "Contacted",
        "interested": "Qualified",
        "qualified": "Qualified",
        "warm": "Qualified",
        "hot": "Qualified",
        "proposal": "Proposal",
        "proposal shared": "Proposal",
        "demo": "Proposal",
        "negotiation": "Proposal",
        "login with lender": "Login with Lender",
        "login initiated": "Login with Lender",
        "bank selected": "Login with Lender",
        "documents requested": "Documentation",
        "documentation": "Documentation",
        "documents pending": "Documentation",
        "credit review": "Credit Review",
        "processing": "Credit Review",
        "sanctioned": "Sanctioned",
        "sanction approved": "Sanctioned",
        "disbursed": "Disbursed",
        "closed won": "Disbursed",
        "won": "Disbursed",
        "closed lost": "Lost",
        "lost": "Lost",
        "rejected": "Lost",
    }
    
    # Default allowed transitions (can be overridden by admin configuration)
    DEFAULT_ALLOWED_TRANSITIONS = {
        "new": ["contacted", "interested", "qualified", "lost"],
        "new lead": ["contacted", "interested", "qualified", "lost"],
        "contacted": ["interested", "qualified", "proposal", "lost"],
        "interested": ["qualified", "proposal", "lost"],
        "qualified": ["proposal", "documents requested", "lost"],
        "warm": ["qualified", "proposal", "lost"],
        "hot": ["proposal", "documents requested", "lost"],
        "proposal": ["documents requested", "credit review", "sanctioned", "lost"],
        "proposal shared": ["documents requested", "credit review", "sanctioned", "lost"],
        "demo": ["proposal", "interested", "lost"],
        "login with lender": ["sanctioned", "disbursed", "lost"],
        "login initiated": ["sanctioned", "disbursed", "lost"],
        "bank selected": ["sanctioned", "disbursed", "lost"],
        "negotiation": ["proposal", "documents requested", "credit review", "sanctioned", "lost"],
        "documents requested": ["documentation", "credit review", "lost"],
        "documentation": ["credit review", "sanctioned", "lost"],
        "documents pending": ["documentation", "credit review", "lost"],
        "credit review": ["sanctioned", "lost"],
        "processing": ["sanctioned", "lost"],
        "sanctioned": ["disbursed"],
        "sanction approved": ["disbursed"],
        "disbursed": [],  # Terminal state
        "closed won": [],  # Terminal state
        "won": [],  # Terminal state
        "closed lost": [],  # Terminal state
        "lost": [],  # Terminal state
        "rejected": [],  # Terminal state
    }
    
    @classmethod
    def get_pipeline_stage_for_status(cls, db: Session, lead_status: str) -> str:
        """Get the pipeline stage for a given lead status"""
        if not lead_status:
            return "New Leads"
        
        # Check database configuration first
        config = db.query(PipelineConfiguration).filter(
            PipelineConfiguration.lead_status == lead_status.lower(),
            PipelineConfiguration.is_active == True
        ).first()
        
        if config:
            return config.pipeline_stage
        
        # Fall back to default mapping
        return cls.DEFAULT_STATUS_TO_PIPELINE.get(lead_status.lower(), "New Leads")
    
    @classmethod
    def is_transition_allowed(cls, db: Session, current_status: str, new_status: str) -> bool:
        """Check if a status transition is allowed"""
        if not current_status or not new_status:
            return True
        
        if current_status.lower() == new_status.lower():
            return True  # No change is always allowed
        
        # Check database configuration first
        config = db.query(PipelineConfiguration).filter(
            PipelineConfiguration.lead_status == current_status.lower(),
            PipelineConfiguration.is_active == True
        ).first()
        
        if config and config.allowed_transitions:
            try:
                allowed = json.loads(config.allowed_transitions)
                return new_status.lower() in [s.lower() for s in allowed]
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Fall back to default allowed transitions
        allowed = cls.DEFAULT_ALLOWED_TRANSITIONS.get(current_status.lower(), [])
        return new_status.lower() in [s.lower() for s in allowed]
    
    @classmethod
    def handle_status_change(
        cls,
        db: Session,
        lead: Lead,
        new_status: str,
        changed_by: UUID,
        remarks: Optional[str] = None,
        background_tasks=None
    ) -> Lead:
        """
        Handle lead status change with automatic pipeline movement.
        This is the main entry point for all status changes.
        """
        previous_status = lead.lead_status
        previous_pipeline_stage = lead.pipeline_stage
        
        # Validate transition
        if not cls.is_transition_allowed(db, previous_status, new_status):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status transition from '{previous_status}' to '{new_status}'"
            )
        
        # Get new pipeline stage
        new_pipeline_stage = cls.get_pipeline_stage_for_status(db, new_status)
        
        # Update lead
        lead.lead_status = new_status
        lead.pipeline_stage = new_pipeline_stage
        lead.updated_at = datetime.utcnow()
        db.add(lead)
        db.commit()
        db.refresh(lead)
        
        # Get user who made the change
        user = db.query(User).filter(User.id == changed_by).first()
        changed_by_name = user.full_name if user else "Unknown"
        
        # Record audit trail
        audit = PipelineTransitionAudit(
            lead_id=lead.id,
            previous_status=previous_status,
            new_status=new_status,
            previous_pipeline_stage=previous_pipeline_stage,
            new_pipeline_stage=new_pipeline_stage,
            changed_by=changed_by,
            changed_by_name=changed_by_name,
            remarks=remarks,
            transition_type="automatic"
        )
        db.add(audit)
        db.commit()
        
        # Add timeline event
        timeline_description = (
            f"Status changed from '{previous_status}' to '{new_status}'. "
            f"Automatically moved from '{previous_pipeline_stage}' to '{new_pipeline_stage}' stage."
        )
        add_timeline_event(
            db,
            TimelineEventCreate(
                lead_id=lead.id,
                event_type="Status Changed",
                description=timeline_description,
            ),
            creator_id=changed_by,
        )
        
        # Notify assigned employee
        if lead.assigned_to and lead.assigned_to != changed_by:
            notification_message = (
                f"Lead '{lead.lead_name}' status changed to '{new_status}'. "
                f"Automatically moved to '{new_pipeline_stage}' stage."
            )
            create_notification(
                db,
                lead.assigned_to,
                title="Lead Status Updated",
                message=notification_message,
            )
            
            # Send real-time notification
            if background_tasks:
                notification_payload = {
                    "type": "lead_status_changed",
                    "payload": {
                        "lead_id": lead.id,
                        "lead_name": lead.lead_name,
                        "previous_status": previous_status,
                        "new_status": new_status,
                        "previous_stage": previous_pipeline_stage,
                        "new_stage": new_pipeline_stage,
                        "changed_by": changed_by_name,
                    },
                }
                background_tasks.add_task(
                    send_notification_sync,
                    str(lead.assigned_to),
                    notification_payload,
                )
        
        # Update employee performance if lead moved to qualifying status
        qualifying_statuses = ["interested", "qualified", "warm", "hot", "proposal", "sanctioned", "disbursed"]
        if new_status.lower() in qualifying_statuses:
            owner_id = lead.created_by or lead.assigned_to
            if owner_id:
                try:
                    employee = db.query(User).filter(User.id == owner_id).first()
                    if employee and str(employee.role).lower() == "employee":
                        PerformanceCalculationService.calculate_daily_performance(
                            db, owner_id, employee.full_name
                        )
                        TargetEngineService.on_lead_added(db, owner_id, employee.full_name, str(lead.id))
                except Exception as e:
                    logger.error(f"Error updating employee performance: {e}")
        
        # Broadcast data sync event for real-time dashboard updates
        if background_tasks:
            background_tasks.add_task(
                broadcast_data_sync_sync,
                'lead',
                'status_changed',
                {
                    'id': lead.id,
                    'lead_status': new_status,
                    'pipeline_stage': new_pipeline_stage,
                    'previous_status': previous_status,
                    'previous_stage': previous_pipeline_stage,
                }
            )

        try:
            from .forecast_service import ForecastCalculationEngine
            engine = ForecastCalculationEngine(db)
            snapshot_stage = lead.pipeline_stage or lead.lead_status or new_pipeline_stage or 'New Leads'
            snapshot_amount = lead.deal_value or lead.funding_amount or 0
            engine.create_forecast_snapshot(
                lead_id=lead.id,
                lead=lead,
                current_stage=snapshot_stage,
                loan_amount=Decimal(str(snapshot_amount or 0)),
                rm_id=str(lead.assigned_to) if lead.assigned_to else None,
                rm_name=None,
            )
        except Exception as exc:
            logger.warning("Forecast snapshot sync failed for lead %s: %s", lead.id, exc)
        
        logger.info(
            f"Lead {lead.id} status changed from '{previous_status}' to '{new_status}', "
            f"pipeline stage updated from '{previous_pipeline_stage}' to '{new_pipeline_stage}'"
        )
        
        return lead
    
    @classmethod
    def get_pipeline_configuration(cls, db: Session) -> List[Dict]:
        """Get all pipeline configurations"""
        configs = db.query(PipelineConfiguration).filter(
            PipelineConfiguration.is_active == True
        ).order_by(PipelineConfiguration.stage_order).all()
        
        return [
            {
                "id": str(config.id),
                "lead_status": config.lead_status,
                "pipeline_stage": config.pipeline_stage,
                "stage_order": config.stage_order,
                "allowed_transitions": json.loads(config.allowed_transitions) if config.allowed_transitions else [],
                "description": config.description,
            }
            for config in configs
        ]
    
    @classmethod
    def get_pipeline_stages(cls, db: Session) -> List[str]:
        """Get all unique pipeline stages"""
        configs = db.query(PipelineConfiguration).filter(
            PipelineConfiguration.is_active == True
        ).all()
        
        stages = set(config.pipeline_stage for config in configs)
        return sorted(list(stages))
    
    @classmethod
    def get_lead_transition_history(cls, db: Session, lead_id: int) -> List[Dict]:
        """Get transition history for a specific lead"""
        audits = db.query(PipelineTransitionAudit).filter(
            PipelineTransitionAudit.lead_id == lead_id
        ).order_by(PipelineTransitionAudit.created_at.desc()).all()
        
        return [
            {
                "id": str(audit.id),
                "previous_status": audit.previous_status,
                "new_status": audit.new_status,
                "previous_pipeline_stage": audit.previous_pipeline_stage,
                "new_pipeline_stage": audit.new_pipeline_stage,
                "changed_by": audit.changed_by_name,
                "remarks": audit.remarks,
                "transition_type": audit.transition_type,
                "created_at": audit.created_at.isoformat(),
            }
            for audit in audits
        ]
    
    @classmethod
    def initialize_default_configurations(cls, db: Session):
        """Initialize default pipeline configurations in database"""
        existing_count = db.query(PipelineConfiguration).count()
        if existing_count > 0:
            logger.info("Pipeline configurations already exist, skipping initialization")
            return
        
        stage_order = 0
        for status, stage in cls.DEFAULT_STATUS_TO_PIPELINE.items():
            allowed = cls.DEFAULT_ALLOWED_TRANSITIONS.get(status, [])
            config = PipelineConfiguration(
                lead_status=status,
                pipeline_stage=stage,
                stage_order=stage_order,
                allowed_transitions=json.dumps(allowed),
                is_active=True,
                description=f"Default mapping for {status} to {stage}"
            )
            db.add(config)
            stage_order += 1
        
        db.commit()
        logger.info("Default pipeline configurations initialized")
