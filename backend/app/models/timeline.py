import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customer_profiles.id"), nullable=True)
    event_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    event_metadata = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("Lead", backref="timeline_events")
    # Defer customer relationship to avoid circular import issues
    # customer = relationship("CustomerProfile", backref="timeline_events")
    creator = relationship("User", foreign_keys=[created_by])
