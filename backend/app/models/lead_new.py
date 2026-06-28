"""Comprehensive Lead Model with all fields from the form"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Info
    lead_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    mobile = Column(String(50), nullable=True)
    alternate_mobile = Column(String(50), nullable=True)
    
    # Company Info
    company_name = Column(String(255), nullable=True)
    company_email = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)  # City, State
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    
    # Assigned User
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Sales Executive Info
    sales_executive = Column(String(255), nullable=True)
    date_of_entry = Column(Date, nullable=True)
    lead_source = Column(String(100), nullable=True)  # Cold Calling, Referral, LinkedIn, etc.
    
    # Company Registration Details
    gst_number = Column(String(100), nullable=True)
    pan_number = Column(String(100), nullable=True)
    entity_type = Column(String(100), nullable=True)  # Sole Proprietor, Partnership, etc.
    annual_turnover = Column(String(100), nullable=True)  # ₹ value
    number_of_employees = Column(Integer, nullable=True)
    year_of_incorporation = Column(Integer, nullable=True)
    registered_office_address = Column(Text, nullable=True)
    business_description = Column(Text, nullable=True)
    
    # Product & Funding
    product_type = Column(String(100), nullable=True)
    funding_amount = Column(Float, nullable=True)
    
    # Call Details
    date_of_first_call = Column(Date, nullable=True)
    purpose_of_call = Column(String(100), nullable=True)  # Introduction, Pitching, Follow-up, etc.
    product_service_discussed = Column(String(255), nullable=True)
    call_outcome = Column(String(100), nullable=True)  # Interested, Follow-up Needed, etc.
    
    # Status & Lead Management
    lead_status = Column(String(100), nullable=False, default="New Lead")
    current_status = Column(String(100), nullable=True)  # New, Contacted, Proposal, etc.
    final_outcome = Column(String(100), nullable=True)  # Pending, Closed Won, Closed Lost, etc.
    
    # Proposal & Follow-up
    proposal_shared = Column(String(50), nullable=True)  # Yes/No
    next_followup_date = Column(Date, nullable=True)
    deal_value_if_closed = Column(String(100), nullable=True)
    
    # Notes & Learning
    remarks = Column(Text, nullable=True)
    learning_challenge = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
