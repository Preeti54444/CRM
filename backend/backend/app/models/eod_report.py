"""End of Day (EOD) Report Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class EODReport(Base):
    __tablename__ = "eod_reports"

    id = Column(Integer, primary_key=True, index=True)
    
    # User & Date Info
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by_name = Column(String(255), nullable=False)
    report_date = Column(DateTime, nullable=False)
    
    # Executive Info
    sales_executive = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Daily Activities
    number_of_calls = Column(Integer, default=0)
    meetings_held = Column(Integer, default=0)
    key_clients_spoken = Column(Text, nullable=True)
    
    # Deal Progress
    deals_moved_next_stage = Column(Text, nullable=True)  # Yes/No + deal name and value
    
    # Challenges & Learnings
    challenges_faced = Column(Text, nullable=True)
    learnings_today = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    
    # Performance Score
    daily_score = Column(Float, default=70)  # 0-100
    
    # Metadata
    is_submitted = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
