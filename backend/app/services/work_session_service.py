from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from ..models.work_session import WorkSession
from ..models.user import User


def _normalize_role(role: Any) -> str:
    return str(role or '').strip().lower()


def get_active_work_session(db: Session, current_user: User) -> WorkSession | None:
    return db.query(WorkSession).filter(
        WorkSession.created_by == str(current_user.id),
        WorkSession.ended_at.is_(None)
    ).order_by(WorkSession.started_at.desc()).first()


def list_work_sessions(db: Session, current_user: User | None = None, staff: bool = False) -> list[WorkSession]:
    query = db.query(WorkSession)
    if not staff and current_user is not None:
        query = query.filter(WorkSession.created_by == str(current_user.id))
    return query.order_by(WorkSession.started_at.desc()).limit(200).all()


def start_work_session(
    db: Session,
    creator: User,
    notes: str | None = None,
    session_metadata: dict[str, Any] | None = None,
) -> WorkSession:
    active = get_active_work_session(db, creator)
    if active is not None:
        raise ValueError('An active work session already exists for this user.')

    session = WorkSession(
        status='active',
        notes=notes,
        session_metadata=session_metadata or {},
        started_at=datetime.utcnow(),
        created_by=str(creator.id),
        created_by_name=(getattr(creator, 'full_name', None) or getattr(creator, 'name', None) or getattr(creator, 'display_name', None)),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def stop_work_session(
    db: Session,
    current_user: User,
    session_id: int | None = None,
    notes: str | None = None,
    allow_staff_override: bool = False,
) -> WorkSession:
    query = db.query(WorkSession)
    if session_id is not None:
        query = query.filter(WorkSession.id == session_id)
    else:
        query = query.filter(WorkSession.created_by == str(current_user.id), WorkSession.ended_at.is_(None))

    session = query.order_by(WorkSession.started_at.desc()).first()
    if session is None:
        raise ValueError('No active work session found to stop.')

    if session.ended_at is not None:
        raise ValueError('This work session is already stopped.')

    if not allow_staff_override and str(session.created_by) != str(current_user.id):
        raise ValueError('Permission denied to stop this work session.')

    if notes:
        existing_notes = session.notes or ''
        if existing_notes and not existing_notes.endswith('\n'):
            existing_notes += '\n'
        session.notes = existing_notes + notes

    session.ended_at = datetime.utcnow()
    duration = session.ended_at - session.started_at
    session.duration_seconds = int(duration.total_seconds())
    session.status = 'stopped'
    session.updated_at = datetime.utcnow()

    db.add(session)
    db.commit()
    db.refresh(session)
    return session
