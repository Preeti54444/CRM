from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class LenderCase(Base):
    __tablename__ = "lender_cases"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(String(120), unique=True, index=True, nullable=False)
    lead_id = Column(Integer, nullable=True, index=True)
    parent_lead_id = Column(Integer, nullable=True)
    lead_company = Column(String(255), nullable=True)
    lender_name = Column(String(255), nullable=False, index=True)
    product_type = Column(String(255), nullable=True)
    applied_loan_amount = Column(Numeric, nullable=True)
    application_status = Column(String(80), nullable=True, index=True)
    contacted_person_name = Column(String(255), nullable=True)
    mobile_no = Column(String(50), nullable=True)
    linkedin_url = Column(String(512), nullable=True)
    outcome_of_call = Column(String(512), nullable=True)
    lender_onboarding_form = Column(String(10), nullable=True)
    contact_status = Column(String(128), nullable=True)
    bank_login_date = Column(String(32), nullable=True)
    bank_reference_number = Column(String(128), nullable=True)
    sanction_date = Column(String(32), nullable=True)
    interest_rate = Column(Numeric, nullable=True)
    tenure_months = Column(Integer, nullable=True)
    emi_amount = Column(Numeric, nullable=True)
    disbursal_amount = Column(Numeric, nullable=True)
    disbursal_date = Column(String(32), nullable=True)
    expected_payout_percent = Column(Numeric, nullable=True)
    actual_payout_received = Column(Numeric, nullable=True)
    payout_date = Column(String(32), nullable=True)
    tat_tracker = Column(JSON, nullable=True, default={})
    rejection_reason = Column(String(512), nullable=True)
    remarks = Column(JSON, nullable=True)

    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_by_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
