"""Pipeline Transition Audit Model for tracking all lead movements"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base
import uuid


class PipelineTransitionAudit(Base):
    __tablename__ = "pipeline_transition_audits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    
    # Status information
    previous_status = Column(String(100), nullable=True)
    new_status = Column(String(100), nullable=False)
    
    # Pipeline stage information
    previous_pipeline_stage = Column(String(100), nullable=True)
    new_pipeline_stage = Column(String(100), nullable=False)
    
    # User information
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    changed_by_name = Column(String(255), nullable=True)
    
    # Additional metadata
    remarks = Column(Text, nullable=True)
    transition_type = Column(String(50), nullable=False, default="automatic")  # automatic, manual, system
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    lead = relationship("Lead", backref="pipeline_transitions")
    user = relationship("User", foreign_keys=[changed_by])
