from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base
from .user import User


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    lead_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    mobile = Column(String(50), nullable=True)
    alternate_mobile = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    company_email = Column(String(255), nullable=True)
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
    
    # Additional fields for Lead Management UI
    followup_date = Column(Date, nullable=True)
    deal_value = Column(Float, nullable=True)

    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
