from datetime import datetime

from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

from ..database import Base


class TimerMetric(Base):
    __tablename__ = "timer_metrics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    work_seconds = Column(Integer, nullable=False, default=0)
    call_seconds = Column(Integer, nullable=False, default=0)
    break_seconds = Column(Integer, nullable=False, default=0)
    meeting_seconds = Column(Integer, nullable=False, default=0)
    call_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
