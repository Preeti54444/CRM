from sqlalchemy import Column, Integer, String, Float, Boolean, JSON
from app.database import Base


class Lender(Base):
    __tablename__ = "lenders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, index=True)
    logo = Column(String(512), nullable=True)
    min_turnover = Column(Float, nullable=True)
    max_loan = Column(Float, nullable=True)
    min_cibil = Column(Integer, nullable=True)
    roi = Column(String(100), nullable=True)
    products = Column(JSON, nullable=True, default=list)
    eligible_types = Column(JSON, nullable=True, default=list)
    ticket_min = Column(Float, nullable=True)
    ticket_max = Column(Float, nullable=True)
    min_vintage = Column(Integer, nullable=True)
    min_dscr = Column(Float, nullable=True)
    requires_atnw_positive = Column(Boolean, nullable=True, default=False)
    requires_owned_property = Column(Boolean, nullable=True, default=False)
    processing_fee = Column(Float, nullable=True)
    foreclosure_charges = Column(Float, nullable=True)
    hidden_charges = Column(Float, nullable=True)
    security_requirement = Column(String(512), nullable=True)
    property_requirement = Column(String(512), nullable=True)
    gst = Column(String(100), nullable=True)
    pan = Column(String(50), nullable=True)
    cin = Column(String(50), nullable=True)
    priority_score = Column(Integer, nullable=True, default=0)
    sla = Column(String(100), nullable=True)
    average_approval_days = Column(Integer, nullable=True)
    average_disbursement_days = Column(Integer, nullable=True)
    historical_approval_rate = Column(Float, nullable=True)
    historical_rejection_rate = Column(Float, nullable=True)
    active_status = Column(Boolean, nullable=True, default=True)
    extra = Column(JSON, nullable=True, default=dict)
