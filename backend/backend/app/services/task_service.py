from __future__ import annotations
from datetime import date, datetime
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.task import Task


def create_task(
    db: Session,
    title: str,
    description: Optional[str],
    assigned_to: str,
    assigned_by: Optional[str],
    priority: str,
    status: str,
    due_date: Optional[date],
) -> Task:
    task = Task(
        title=title,
        description=description,
        assigned_to=assigned_to,
        assigned_by=assigned_by,
        priority=priority,
        status=status,
        due_date=due_date,
        created_at=datetime.utcnow(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_task_by_id(db: Session, task_id: int | str) -> Task | None:
    if isinstance(task_id, str):
        try:
            task_id = int(task_id)
        except ValueError:
            return None
    return db.query(Task).filter(Task.id == task_id).first()


def list_tasks(
    db: Session,
    current_user_id: str,
    current_user_role: str,
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Task]:
    query = db.query(Task)
    if current_user_role == "Employee":
        query = query.filter(Task.assigned_to == current_user_id)
    elif assigned_to is not None:
        query = query.filter(Task.assigned_to == assigned_to)
    if status:
        query = query.filter(Task.status == status)
    return query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()


def update_task(
    db: Session,
    task: Task,
    title: Optional[str] = None,
    description: Optional[str] = None,
    assigned_to: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    due_date: Optional[date] = None,
) -> Task:
    if title is not None:
        task.title = title
    if description is not None:
        task.description = description
    if assigned_to is not None:
        task.assigned_to = assigned_to
    if priority is not None:
        task.priority = priority
    if status is not None:
        task.status = status
    if due_date is not None:
        task.due_date = due_date
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task_status(db: Session, task: Task, status: str) -> Task:
    task.status = status
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_task_summary(db: Session, current_user_id: str, current_user_role: str) -> dict[str, int]:
    today = datetime.utcnow().date()
    query = db.query(Task)
    if current_user_role == "Employee":
        query = query.filter(Task.assigned_to == current_user_id)
    total_tasks = query.count()
    assigned_today = query.filter(func.date(Task.created_at) == today).count()
    pending_tasks = query.filter(Task.status != "Completed").count()
    completed_tasks = query.filter(Task.status == "Completed").count()
    overdue_tasks = query.filter(Task.due_date < today, Task.status != "Completed").count()
    return {
        "total_tasks": total_tasks,
        "assigned_today": assigned_today,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
    }
