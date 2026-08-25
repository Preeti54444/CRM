"""Weekly Overall Day (WOD) Report Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Boolean, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class WODReport(Base):
    __tablename__ = "wod_reports"

    id = Column(Integer, primary_key=True, index=True)
    
    # User & Date Info
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by_name = Column(String(255), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    
    # Executive Info
    sales_executive = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Weekly Targets & Achievements
    weekly_target = Column(Text, nullable=True)  # ₹/Leads
    achieved = Column(Text, nullable=True)
    deals_closed = Column(Text, nullable=True)  # ₹/Count
    
    # Pipeline & Opportunities
    hot_leads_in_pipeline = Column(Text, nullable=True)
    key_wins_this_week = Column(Text, nullable=True)
    lost_opportunities = Column(Text, nullable=True)
    
    # Action Plan
    action_plan_next_week = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    
    # Metadata
    is_submitted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
