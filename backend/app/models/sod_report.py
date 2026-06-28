"""Start of Day (SOD) Report Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class SODReport(Base):
    __tablename__ = "sod_reports"

    id = Column(Integer, primary_key=True, index=True)
    
    # User & Date Info
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by_name = Column(String(255), nullable=False)
    report_date = Column(DateTime, nullable=False)
    
    # Executive Info
    sales_executive = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Daily Objectives
    territory_region = Column(String(255), nullable=True)
    target_for_today = Column(Text, nullable=True)  # ₹/Units
    key_meetings_planned = Column(Text, nullable=True)
    focus_industry_segment = Column(Text, nullable=True)
    
    # Support & Notes
    support_needed = Column(String(50), default="No")  # Yes/No
    support_description = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)

    # Metadata
    is_submitted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
