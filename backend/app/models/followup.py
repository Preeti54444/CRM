import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    followup_date = Column(DateTime, nullable=False, index=True)
    followup_time = Column(Time, nullable=True, index=True)
    followup_type = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    next_followup_date = Column(DateTime, nullable=True)
    next_followup_time = Column(Time, nullable=True)
    status = Column(String(50), nullable=False, default="scheduled", index=True)
    reminder_sent = Column(Boolean, default=False, nullable=False)
    followup_completed = Column(Boolean, default=False, nullable=False, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lead = relationship("Lead", backref="followups")
    assignee = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
