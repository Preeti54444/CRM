from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text

from ..database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    meeting_date = Column(DateTime, nullable=True)
    meeting_link = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="scheduled")
    created_at = Column(DateTime, default=datetime.utcnow)
