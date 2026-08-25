from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base
from .user import User


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic Info
    lead_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    mobile = Column(String(50), nullable=True)
    alternate_mobile = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    company_email = Column(String(255), nullable=True)
    designation = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    
    # Assigned User
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    sales_executive = Column(String(255), nullable=True)
    date_of_entry = Column(Date, nullable=True)
    
    # Product & Funding
    product_type = Column(String(100), nullable=True)
    vertical = Column(String(100), nullable=True)
    sub_product = Column(String(100), nullable=True)
    funding_amount = Column(Float, nullable=True)
    lead_source = Column(String(100), nullable=True)
    
    # Company Registration Details
    gst_number = Column(String(100), nullable=True)
    pan_number = Column(String(100), nullable=True)
    entity_type = Column(String(100), nullable=True)
    annual_turnover = Column(String(100), nullable=True)
    business_vintage = Column(String(100), nullable=True)
    number_of_employees = Column(Integer, nullable=True)
    year_of_incorporation = Column(Integer, nullable=True)
    registered_office_address = Column(Text, nullable=True)
    business_description = Column(Text, nullable=True)
    
    # Industry & Credit Profile
    industry = Column(String(255), nullable=True)
    credit_rating = Column(String(100), nullable=True)
    promoter_cibil_score = Column(String(100), nullable=True)
    npa_history = Column(String(100), nullable=True)
    guarantee_available = Column(String(100), nullable=True)
    current_ratio = Column(String(100), nullable=True)
    interest_coverage_ratio = Column(String(100), nullable=True)
    dscr = Column(String(100), nullable=True)
    
    # Call Details
    date_of_first_call = Column(Date, nullable=True)
    purpose_of_call = Column(String(100), nullable=True)
    product_service_discussed = Column(String(255), nullable=True)
    call_outcome = Column(String(100), nullable=True)
    
    # Status & Lead Management
    lead_status = Column(String(100), nullable=False, default="New")
    current_status = Column(String(100), nullable=True)
    final_outcome = Column(String(100), nullable=True)
    lead_stage = Column(String(100), nullable=True)
    pipeline_stage = Column(String(100), nullable=True, default="New Leads")
    last_activity_date = Column(Date, nullable=True)
    last_stage_change_date = Column(DateTime, nullable=True)
    
    # Ownership Management
    ownership_locked = Column(DateTime, nullable=True)  # When ownership was locked (30-day inactivity)
    ownership_locked_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    last_call_date = Column(DateTime, nullable=True)
    last_followup_date = Column(DateTime, nullable=True)
    last_remark_date = Column(DateTime, nullable=True)
    last_document_upload_date = Column(DateTime, nullable=True)
    last_meeting_date = Column(DateTime, nullable=True)
    
    # Proposal & Follow-up
    proposal_shared = Column(String(50), nullable=True)
    next_followup_date = Column(Date, nullable=True)
    followup_time = Column(Time, nullable=True)
    followup_type = Column(String(100), nullable=True)
    followup_note = Column(Text, nullable=True)
    deal_value = Column(Float, nullable=True)
    
    # Notes & Learning
    remarks = Column(Text, nullable=True)
    learning_challenge = Column(Text, nullable=True)
    
    # Rating Details
    rating_date = Column(String(50), nullable=True)
    rating_agency = Column(String(255), nullable=True)
    lender_related_detail = Column(String(1000), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
