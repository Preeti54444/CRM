"""Target Audit Service - Immutable audit trail"""
import json
import logging
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session

from ..models.target_management import TargetAuditLog
from ..models.user import User

logger = logging.getLogger(__name__)

class TargetAuditService:
    """Log all target-related actions (non-deletable)"""

    @staticmethod
    def log(
        db: Session,
        action: str,
        employee_id: Optional[UUID] = None,
        actor_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Optional[TargetAuditLog]:
        try:
            entry = TargetAuditLog(
                employee_id=employee_id,
                actor_id=actor_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
                metadata_json=json.dumps(metadata) if metadata else None,
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return entry
        except Exception as e:
            logger.error(f"Error logging audit entry: {e}")
            db.rollback()
            return None

    @staticmethod
    def get_logs(
        db: Session,
        employee_id: Optional[UUID] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[dict]:
        query = db.query(TargetAuditLog)
        if employee_id:
            query = query.filter(TargetAuditLog.employee_id == employee_id)
        if action:
            query = query.filter(TargetAuditLog.action == action)

        logs = query.order_by(TargetAuditLog.created_at.desc()).offset(offset).limit(limit).all()
        result = []
        for log in logs:
            employee = db.query(User).filter(User.id == log.employee_id).first() if log.employee_id else None
            actor = db.query(User).filter(User.id == log.actor_id).first() if log.actor_id else None
            result.append({
                "id": log.id,
                "employee_id": str(log.employee_id) if log.employee_id else None,
                "employee_name": employee.full_name if employee else None,
                "actor_id": str(log.actor_id) if log.actor_id else None,
                "actor_name": actor.full_name if actor else None,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "details": log.details,
                "created_at": log.created_at,
            })
        return result
