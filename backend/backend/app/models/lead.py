from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    lead_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    mobile = Column(String(50), nullable=True, index=True)
    alternate_mobile = Column(String(50), nullable=True, index=True)
    email = Column(String(255), nullable=True, index=True)
    company_email = Column(String(255), nullable=True, index=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    product_type = Column(String(100), nullable=True)
    funding_amount = Column(Float, nullable=True)
    lead_source = Column(String(100), nullable=True)
    lead_status = Column(String(100), nullable=False, default="New")
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    remarks = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Duplicate tracking columns
    duplicate_status = Column(String(50), default="Unique", nullable=False)  # Unique, Potential Duplicate, Duplicate, Merged
    duplicate_reason = Column(String(500), nullable=True)
    duplicate_of_lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)

    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
    original_lead = relationship("Lead", remote_side=[id], foreign_keys=[duplicate_of_lead_id])
    
    # Composite index for company_name
    __table_args__ = (
        Index('idx_company_name', 'company_name'),
    )
