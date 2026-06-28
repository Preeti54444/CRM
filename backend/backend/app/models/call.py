"""Call/Contact Log Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Call(Base):
    __tablename__ = "calls"

    id = Column(Integer, primary_key=True, index=True)
    call_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Call Info
    call_type = Column(String(50), nullable=False)  # Inbound, Outbound
    call_date = Column(Date, nullable=False)
    call_time = Column(Time, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    
    # Caller Info
    caller_name = Column(String(255), nullable=True)
    caller_phone = Column(String(50), nullable=False)
    
    # Receiver/Contact
    receiver_name = Column(String(255), nullable=True)
    receiver_phone = Column(String(50), nullable=True)
    receiver_email = Column(String(255), nullable=True)
    
    # Related Records
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Call Details
    purpose = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Call Outcome & Status
    status = Column(String(50), nullable=False, default="Completed")  # Resolved, Follow-up Required, Escalated, No Answer, Callback Scheduled
    priority = Column(String(50), nullable=False, default="Normal")  # Normal, High, Urgent, Low
    outcome = Column(Text, nullable=True)
    
    # Follow-up
    followup_required = Column(String(50), nullable=True)  # Yes/No
    followup_date = Column(Date, nullable=True)
    followup_notes = Column(Text, nullable=True)
    
    # Recording & Notes
    recording_link = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", foreign_keys=[lead_id])
    user = relationship("User", foreign_keys=[created_by])
