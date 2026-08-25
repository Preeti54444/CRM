from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas.timer import WorkSessionCreate, WorkSessionResponse, WorkSessionStopRequest
from ..services.work_session_service import (
    get_active_work_session,
    list_work_sessions,
    start_work_session,
    stop_work_session,
)

router = APIRouter(prefix="/work-sessions", tags=["work_sessions"])


def _is_staff_user(current_user) -> bool:
    return str(getattr(current_user, 'role', '')).lower() in {'admin', 'manager'}


@router.post("/start", response_model=WorkSessionResponse, status_code=status.HTTP_201_CREATED)
def start_work_session_route(
    payload: WorkSessionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        session = start_work_session(db, creator=current_user, notes=payload.notes, session_metadata=payload.session_metadata)
        # ensure created_by is serializable as string for response
        try:
            if hasattr(session, 'created_by') and session.created_by is not None:
                session.created_by = str(session.created_by)
        except Exception:
            pass
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return session


@router.post("/stop", response_model=WorkSessionResponse)
def stop_work_session_route(
    payload: WorkSessionStopRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        allow_override = _is_staff_user(current_user)
        session = stop_work_session(
            db,
            current_user=current_user,
            session_id=payload.session_id,
            notes=payload.notes,
            allow_staff_override=allow_override,
        )
        try:
            if hasattr(session, 'created_by') and session.created_by is not None:
                session.created_by = str(session.created_by)
        except Exception:
            pass
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return session


@router.get("/active", response_model=WorkSessionResponse | None)
def get_active_work_session_route(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    active = get_active_work_session(db, current_user)
    if active and hasattr(active, 'created_by') and active.created_by is not None:
        try:
            active.created_by = str(active.created_by)
        except Exception:
            pass
    return active


@router.get("", response_model=List[WorkSessionResponse])
def list_work_sessions_route(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sessions = list_work_sessions(db, current_user=current_user, staff=_is_staff_user(current_user))
    # ensure created_by fields are strings to satisfy response model validation
    try:
        for s in sessions:
            if hasattr(s, 'created_by') and s.created_by is not None:
                try:
                    s.created_by = str(s.created_by)
                except Exception:
                    pass
    except Exception:
        pass
    return sessions
