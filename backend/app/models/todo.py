from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Time
from sqlalchemy.dialects.postgresql import UUID

from ..database import Base


class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    due_time = Column(Time, nullable=True)
    priority = Column(String(50), nullable=False, default="normal")
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
