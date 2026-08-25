from datetime import date, datetime, time, timedelta
from typing import Any, Dict, List
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..auth.dependencies import get_current_user
from ..dependencies import get_db
from ..models.activity import Activity
from ..models.call import Call
from ..models.document import Document
from ..models.followup import FollowUp
from ..models.lead import Lead
from ..models.meeting import Meeting
from ..models.task import Task
from ..models.user import User
from ..services.target_engine_service import TargetEngineService

router = APIRouter(prefix="/api", tags=["my-todo"])
logger = logging.getLogger(__name__)


def _date_window() -> tuple[date, datetime, datetime]:
    today = date.today()
    today_start = datetime.combine(today, time.min)
    tomorrow_start = today_start + timedelta(days=1)
    return today, today_start, tomorrow_start


def _normalize_status(value: Any) -> str:
    return str(value or "").strip().lower()


def _is_completed_status(value: Any) -> bool:
    return _normalize_status(value) in {"completed", "done", "closed", "resolved", "success", "finished"}


def _count_calls_today(db: Session, employee_id) -> int:
    today, today_start, tomorrow_start = _date_window()
    return (
        db.query(Call)
        .filter(
            Call.created_by == employee_id,
            Call.call_date == today,
            Call.status.in_(["Completed", "completed", "Done", "done", "Resolved", "resolved"]),
            Call.call_type.in_(["Inbound", "Outbound", "Incoming", "Outgoing"]),
        )
        .count()
    )


def _count_leads_today(db: Session, employee_id) -> int:
    _, today_start, tomorrow_start = _date_window()
    return (
        db.query(Lead)
        .filter(
            Lead.created_by == employee_id,
            Lead.created_at >= today_start,
            Lead.created_at < tomorrow_start,
        )
        .count()
    )


def _count_meetings_today(db: Session, employee_id) -> Dict[str, int]:
    today, today_start, tomorrow_start = _date_window()
    meetings = (
        db.query(Meeting)
        .filter(
            Meeting.meeting_date >= today_start,
            Meeting.meeting_date < tomorrow_start,
            Meeting.status.in_(["scheduled", "completed"]),
        )
        .all()
    )
    completed_meetings = sum(1 for meeting in meetings if _normalize_status(meeting.status) == "completed")
    return {
        "total": len(meetings),
        "completed": completed_meetings,
        "pending": max(0, len(meetings) - completed_meetings),
    }


def _count_tasks_today(db: Session, employee_id) -> Dict[str, int]:
    _, today_start, tomorrow_start = _date_window()
    assigned_today = (
        db.query(Task)
        .filter(
            Task.assigned_to == employee_id,
            Task.due_date >= today_start,
            Task.due_date < tomorrow_start,
        )
        .count()
    )
    completed_today = (
        db.query(Task)
        .filter(
            Task.assigned_to == employee_id,
            Task.due_date >= today_start,
            Task.due_date < tomorrow_start,
            Task.status.ilike("%completed%"),
        )
        .count()
    )
    return {"assigned": assigned_today, "completed": completed_today}


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    try:
        target_panel = TargetEngineService.get_today_target_panel(
            db, current_user.id, getattr(current_user, "full_name", None) or current_user.email
        )
    except Exception as e:
        logger.error(f"Error getting target panel: {e}")
        # Return default values if target panel fails
        target_panel = None
    
    calls_today = _count_calls_today(db, current_user.id)
    leads_today = _count_leads_today(db, current_user.id)
    meetings_today = _count_meetings_today(db, current_user.id)
    tasks_today = _count_tasks_today(db, current_user.id)

    if target_panel:
        calls_target = max(0, int(target_panel.daily_calls_target or 0))
        leads_target = max(0, int(target_panel.daily_leads_target or 0))
    else:
        calls_target = 0
        leads_target = 0
    
    meetings_target = max(0, meetings_today["total"])
    task_target = max(0, tasks_today["assigned"])

    calls_pct = round((calls_today / calls_target) * 100, 1) if calls_target else 0
    leads_pct = round((leads_today / leads_target) * 100, 1) if leads_target else 0
    meetings_pct = round((meetings_today["completed"] / meetings_target) * 100, 1) if meetings_target else 0
    task_pct = round((tasks_today["completed"] / task_target) * 100, 1) if task_target else 0

    # Get assigned target info
    try:
        from ..models.targets import Target
        assigned_target_info = None
        assigned_target = db.query(Target).filter(Target.user_id == current_user.id).first()
        if assigned_target:
            assigned_by_user = None
            if assigned_target.assigned_by:
                assigned_by_user = db.query(User).filter(User.id == assigned_target.assigned_by).first()
            
            assigned_target_info = {
                "assigned_at": assigned_target.assigned_at.isoformat() if assigned_target.assigned_at else None,
                "assigned_by": assigned_by_user.full_name if assigned_by_user else None,
                "notification_sent": assigned_target.notification_sent,
            }
    except Exception as e:
        logger.error(f"Error getting assigned target info: {e}")
        assigned_target_info = None

    return {
        "calls": {"done": calls_today, "target": calls_target, "pct": calls_pct},
        "leads": {"done": leads_today, "target": leads_target, "pct": leads_pct},
        "meetings": {
            "done": meetings_today["completed"],
            "target": meetings_target,
            "pending": meetings_today["pending"],
            "pct": meetings_pct,
        },
        "tasks": {"done": tasks_today["completed"], "target": task_target, "pct": task_pct},
        "assigned_target_info": assigned_target_info,
    }


@router.get("/tasks/high-priority")
def high_priority_tasks(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    limit: int = Query(5, ge=1, le=10),
):
    _, today_start, tomorrow_start = _date_window()
    tasks = (
        db.query(Task)
        .filter(
            Task.assigned_to == current_user.id,
            Task.priority.ilike("%high%"),
            Task.status.notilike("%completed%"),
            Task.due_date >= today_start,
            Task.due_date < tomorrow_start,
        )
        .order_by(Task.due_date.asc(), Task.created_at.asc())
        .limit(limit)
        .all()
    )

    result: List[Dict[str, Any]] = []
    for task in tasks:
        result.append(
            {
                "id": task.id,
                "title": task.title,
                "lead_name": task.description or "—",
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "due_time": task.due_date.strftime("%I:%M %p") if task.due_date else None,
                "priority": task.priority,
                "status": task.status,
            }
        )
    return result


@router.get("/todos/today")
def todos_today(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    _, today_start, tomorrow_start = _date_window()
    tasks = (
        db.query(Task)
        .filter(
            Task.assigned_to == current_user.id,
            Task.due_date >= today_start,
            Task.due_date < tomorrow_start,
        )
        .order_by(Task.due_date.asc(), Task.created_at.asc())
        .all()
    )

    return [
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "due_time": task.due_date.strftime("%I:%M %p") if task.due_date else None,
            "priority": task.priority,
            "status": task.status,
            "completed": _is_completed_status(task.status),
        }
        for task in tasks
    ]


@router.get("/activities/upcoming")
def activities_upcoming(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    today, today_start, tomorrow_start = _date_window()
    until = today_start + timedelta(days=14)

    meetings = (
        db.query(Meeting)
        .filter(
            Meeting.meeting_date >= today_start,
            Meeting.meeting_date <= until,
            Meeting.status.in_(["scheduled", "completed"]),
        )
        .all()
    )

    tasks = (
        db.query(Task)
        .filter(
            Task.assigned_to == current_user.id,
            Task.due_date >= today_start,
            Task.due_date <= until,
        )
        .all()
    )

    followups = (
        db.query(FollowUp)
        .filter(
            FollowUp.assigned_to == current_user.id,
            FollowUp.followup_date >= today_start,
            FollowUp.followup_date <= until,
        )
        .all()
    )

    activities: List[Dict[str, Any]] = []
    for meeting in meetings:
        activities.append(
            {
                "id": f"meeting-{meeting.id}",
                "title": meeting.title,
                "type": "meeting",
                "time": meeting.meeting_date,
                "lead_name": meeting.notes or "—",
            }
        )
    for task in tasks:
        activities.append(
            {
                "id": f"task-{task.id}",
                "title": task.title,
                "type": "task",
                "time": task.due_date,
                "lead_name": task.description or "—",
            }
        )
    for followup in followups:
        activities.append(
            {
                "id": f"followup-{followup.id}",
                "title": "Follow-up",
                "type": "follow-up",
                "time": datetime.combine(followup.followup_date.date(), followup.followup_time or time.min) if followup.followup_date else None,
                "lead_name": str(followup.id),
            }
        )

    activities = sorted(
        [activity for activity in activities if activity["time"] is not None],
        key=lambda item: item["time"],
    )[:10]

    return [
        {
            "id": activity["id"],
            "title": activity["title"],
            "kind": activity["type"],
            "start_date": activity["time"].date().isoformat() if isinstance(activity["time"], datetime) else None,
            "start_time": activity["time"].strftime("%I:%M %p") if isinstance(activity["time"], datetime) else None,
            "details": activity["lead_name"],
        }
        for activity in activities
    ]


@router.get("/documents/pending")
def documents_pending(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    docs = db.query(Document).filter(Document.status != "uploaded").order_by(Document.due_date).limit(20).all()
    return [
        {
            "id": doc.id,
            "name": doc.name,
            "status": doc.status,
            "due_date": doc.due_date.isoformat() if doc.due_date else None,
        }
        for doc in docs
    ]
