from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base
from .user import User


class LeadOwnershipHistory(Base):
    __tablename__ = "lead_ownership_history"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    
    # Previous owner details
    previous_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    previous_owner_name = Column(String(255), nullable=True)
    
    # New owner details
    new_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    new_owner_name = Column(String(255), nullable=False)
    
    # Transfer details
    transfer_reason = Column(Text, nullable=True)
    transfer_date = Column(DateTime, default=datetime.utcnow)
    
    # Additional context
    last_activity_date = Column(DateTime, nullable=True)
    days_inactive = Column(Integer, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    lead = relationship("Lead", foreign_keys=[lead_id])
    previous_owner = relationship("User", foreign_keys=[previous_owner_id])
    new_owner = relationship("User", foreign_keys=[new_owner_id])
