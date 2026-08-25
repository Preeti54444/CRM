"""Pipeline Configuration and Management Endpoints"""
import json
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..dependencies import get_db
from ..auth.dependencies import require_admin
from ..services.pipeline_transition_service import PipelineTransitionService
from ..models.pipeline_configuration import PipelineConfiguration

router = APIRouter(prefix="/pipeline", tags=["pipeline"])
logger = logging.getLogger(__name__)


class PipelineConfigurationCreate(BaseModel):
    lead_status: str
    pipeline_stage: str
    stage_order: int = 0
    allowed_transitions: List[str] = []
    description: Optional[str] = None


class PipelineConfigurationUpdate(BaseModel):
    pipeline_stage: Optional[str] = None
    stage_order: Optional[int] = None
    allowed_transitions: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/configuration")
def get_pipeline_configuration(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Get all pipeline configurations"""
    try:
        return PipelineTransitionService.get_pipeline_configuration(db)
    except Exception as e:
        logger.error(f"Error getting pipeline configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stages")
def get_pipeline_stages(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Get all unique pipeline stages"""
    try:
        return {"stages": PipelineTransitionService.get_pipeline_stages(db)}
    except Exception as e:
        logger.error(f"Error getting pipeline stages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configuration")
def create_pipeline_configuration(
    config: PipelineConfigurationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Create a new pipeline configuration"""
    try:
        # Check if status already exists
        existing = db.query(PipelineConfiguration).filter(
            PipelineConfiguration.lead_status == config.lead_status.lower()
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Configuration for status '{config.lead_status}' already exists"
            )
        
        new_config = PipelineConfiguration(
            lead_status=config.lead_status.lower(),
            pipeline_stage=config.pipeline_stage,
            stage_order=config.stage_order,
            allowed_transitions=json.dumps(config.allowed_transitions),
            description=config.description,
            is_active=True,
        )
        
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        
        return {
            "id": str(new_config.id),
            "lead_status": new_config.lead_status,
            "pipeline_stage": new_config.pipeline_stage,
            "stage_order": new_config.stage_order,
            "allowed_transitions": config.allowed_transitions,
            "description": new_config.description,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating pipeline configuration: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/configuration/{lead_status}")
def update_pipeline_configuration(
    lead_status: str,
    config: PipelineConfigurationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Update an existing pipeline configuration"""
    try:
        existing = db.query(PipelineConfiguration).filter(
            PipelineConfiguration.lead_status == lead_status.lower()
        ).first()
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration for status '{lead_status}' not found"
            )
        
        if config.pipeline_stage is not None:
            existing.pipeline_stage = config.pipeline_stage
        if config.stage_order is not None:
            existing.stage_order = config.stage_order
        if config.allowed_transitions is not None:
            existing.allowed_transitions = json.dumps(config.allowed_transitions)
        if config.description is not None:
            existing.description = config.description
        if config.is_active is not None:
            existing.is_active = config.is_active
        
        db.add(existing)
        db.commit()
        db.refresh(existing)
        
        return {
            "id": str(existing.id),
            "lead_status": existing.lead_status,
            "pipeline_stage": existing.pipeline_stage,
            "stage_order": existing.stage_order,
            "allowed_transitions": json.loads(existing.allowed_transitions) if existing.allowed_transitions else [],
            "description": existing.description,
            "is_active": existing.is_active,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pipeline configuration: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/configuration/{lead_status}")
def delete_pipeline_configuration(
    lead_status: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Delete a pipeline configuration"""
    try:
        existing = db.query(PipelineConfiguration).filter(
            PipelineConfiguration.lead_status == lead_status.lower()
        ).first()
        
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration for status '{lead_status}' not found"
            )
        
        db.delete(existing)
        db.commit()
        
        return {"message": f"Configuration for status '{lead_status}' deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pipeline configuration: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/{lead_id}")
def get_lead_transition_history(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Get transition history for a specific lead"""
    try:
        return {
            "lead_id": lead_id,
            "transitions": PipelineTransitionService.get_lead_transition_history(db, lead_id)
        }
    except Exception as e:
        logger.error(f"Error getting lead transition history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/initialize")
def initialize_default_configurations(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Initialize default pipeline configurations"""
    try:
        PipelineTransitionService.initialize_default_configurations(db)
        return {"message": "Default pipeline configurations initialized successfully"}
    except Exception as e:
        logger.error(f"Error initializing default configurations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
