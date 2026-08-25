"""Loan Application / Case Management Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Relationships
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    parent_lead_id = Column(String(100), nullable=True)
    
    # Lender Info
    lender_name = Column(String(255), nullable=False)
    product_type = Column(String(100), nullable=True)  # Working Capital, etc.
    
    # Loan Details
    applied_loan_amount = Column(Float, nullable=True)
    application_status = Column(String(100), nullable=False, default="Proposal Shared")
    # Status options: Proposal Shared, Documentation, Negotiation, Processing, Sanctioned, Disbursed, Rejected
    
    # Contact Person Details
    contacted_person_name = Column(String(255), nullable=True)
    contact_mobile = Column(String(50), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    
    # Call & Onboarding
    call_outcome = Column(Text, nullable=True)
    lender_onboarding_form = Column(String(50), default="No")  # Yes/No
    contact_status = Column(String(100), nullable=True)
    
    # Bank Processing
    bank_login_date = Column(Date, nullable=True)
    bank_reference_number = Column(String(100), nullable=True)
    sanction_date = Column(Date, nullable=True)
    
    # Loan Terms
    interest_rate = Column(Float, nullable=True)  # % per annum
    tenure_months = Column(Integer, nullable=True)
    emi_amount = Column(Float, nullable=True)
    
    # Disbursal Details
    disbursal_amount = Column(Float, nullable=True)
    disbursal_date = Column(Date, nullable=True)
    expected_payout_percent = Column(Float, nullable=True)
    
    # Payout & Settlement
    actual_payout_received = Column(Float, nullable=True)
    payout_date = Column(Date, nullable=True)
    tat_tracker = Column(String(100), nullable=True)  # TAT Tracker (e.g., 7d SLA)
    
    # If Rejected
    rejection_reason = Column(Text, nullable=True)
    
    # Notes
    remarks = Column(Text, nullable=True)
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", foreign_keys=[lead_id])
    creator = relationship("User", foreign_keys=[created_by])
