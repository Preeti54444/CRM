"""Pipeline Configuration Model for Status-to-Stage Mapping"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base
import uuid


class PipelineConfiguration(Base):
    __tablename__ = "pipeline_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_status = Column(String(100), nullable=False, unique=True, index=True)
    pipeline_stage = Column(String(100), nullable=False)
    stage_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    allowed_transitions = Column(Text, nullable=True)  # JSON array of allowed next statuses
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
