from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class LeadDuplicateLog(Base):
    """
    Audit log for tracking duplicate lead attempts.
    Records every duplicate detection event for analysis and tracking.
    """
    __tablename__ = "lead_duplicate_logs"

    id = Column(Integer, primary_key=True, index=True)
    new_lead_data = Column(JSON, nullable=False)  # Full data of the attempted new lead
    existing_lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    duplicate_type = Column(String(50), nullable=False)  # hard_duplicate, potential_duplicate
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    existing_lead = relationship("Lead", foreign_keys=[existing_lead_id])
    creator = relationship("User", foreign_keys=[created_by])







