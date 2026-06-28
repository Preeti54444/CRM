"""Lender Query Model"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class LenderQuery(Base):
    __tablename__ = "lender_queries"

    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # Related Records
    application_id = Column(String(100), nullable=False, index=True)
    
    # Query Details
    description = Column(Text, nullable=False)
    
    # Status & Priority
    status = Column(String(50), nullable=False, default="Open")  # Open, Resolved, Closed, In Progress
    priority = Column(String(50), nullable=False, default="Normal")  # Normal, High, Urgent, Low
    
    # Assignment & Handling
    assigned_handler = Column(String(255), nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Required Documents
    required_documents = Column(Text, nullable=True)  # Comma-separated: Balance Sheet, Bank Statements, PAN
    
    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    handler = relationship("User", foreign_keys=[assigned_to])
    creator = relationship("User", foreign_keys=[created_by])
