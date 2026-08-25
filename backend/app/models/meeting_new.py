"""Comprehensive Meeting Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Meeting Info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    meeting_type = Column(String(100), nullable=False)  # Client, Lender, Internal, Negotiation, Follow-up
    
    # Date & Time
    meeting_date = Column(Date, nullable=False)
    meeting_time = Column(Time, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    
    # Participants
    organized_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    participants = Column(Text, nullable=True)  # JSON or comma-separated emails/names
    meeting_link = Column(String(500), nullable=True)
    location = Column(String(255), nullable=True)
    
    # Related Records
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    application_id = Column(String(100), nullable=True)
    lender_name = Column(String(255), nullable=True)
    
    # Meeting Details
    agenda = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    action_items = Column(Text, nullable=True)
    
    # Status & Outcome
    status = Column(String(50), nullable=False, default="Scheduled")  # Scheduled, Confirmed, Completed, Cancelled
    outcome = Column(Text, nullable=True)
    follow_up_required = Column(String(50), nullable=True)  # Yes/No
    next_meeting_date = Column(Date, nullable=True)
    
    # Attachments & Records
    attachments = Column(Text, nullable=True)  # File paths or URLs
    recording_link = Column(String(500), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organizer = relationship("User", foreign_keys=[organized_by])
    lead = relationship("Lead", foreign_keys=[lead_id])
