"""Contact/Customer Profile Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Basic Info
    contact_name = Column(String(255), nullable=False)
    designation = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    
    # Company Link
    company_name = Column(String(255), nullable=True)
    company_registration_number = Column(String(100), nullable=True)
    
    # Related Records
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Contact Details
    alternate_phone = Column(String(50), nullable=True)
    alternate_email = Column(String(255), nullable=True)
    linkedin_profile = Column(String(500), nullable=True)
    
    # Location
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    
    # Status & Notes
    contact_status = Column(String(50), nullable=False, default="Active")  # Active, Inactive, Do Not Contact
    is_primary_contact = Column(String(50), default="No")  # Yes/No
    
    notes = Column(Text, nullable=True)
    
    # Metadata
    last_contacted = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", foreign_keys=[lead_id])
    user = relationship("User", foreign_keys=[created_by])
