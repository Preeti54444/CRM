from datetime import datetime
from sqlalchemy import Column, Date, DateTime, Date, ForeignKey, Integer, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class Target(Base):
    __tablename__ = "targets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    role = Column(String(50), nullable=False)
    daily_call_target = Column(Integer, nullable=False, default=0)
    daily_lead_target = Column(Integer, nullable=False, default=0)
    weekly_lead_target = Column(Integer, nullable=False, default=0)
    crm_log_deadline = Column(Time, nullable=True)
    effective_from = Column(Date, nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    updated_by_user = relationship("User", foreign_keys=[updated_by])
