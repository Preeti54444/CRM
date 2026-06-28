"""Task Management Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Task Info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(100), nullable=True)
    
    # Assignment
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Related Records
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    application_id = Column(String(100), nullable=True)
    
    # Dates
    due_date = Column(Date, nullable=False)
    start_date = Column(Date, nullable=True)
    completed_date = Column(Date, nullable=True)
    
    # Priority & Status
    priority = Column(String(50), nullable=False, default="Normal")  # Low, Normal, High, Urgent
    status = Column(String(50), nullable=False, default="Open")  # Open, In Progress, Completed, On Hold, Cancelled
    
    # Progress
    percentage_complete = Column(Integer, default=0)  # 0-100
    is_completed = Column(Boolean, default=False)
    
    # Details
    notes = Column(Text, nullable=True)
    completion_notes = Column(Text, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assignee = relationship("User", foreign_keys=[assigned_to])
    assigner = relationship("User", foreign_keys=[assigned_by])
    lead = relationship("Lead", foreign_keys=[lead_id])
