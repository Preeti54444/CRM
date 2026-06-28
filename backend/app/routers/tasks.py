from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas.task import TaskCreate, TaskResponse, TaskSummary, TaskStatusUpdate, TaskUpdate
from ..schemas.user import UserRole
from ..services.activity_log_service import create_activity_log
from ..services.notification_service import create_notification_event
from ..services.websocket_notification_service import send_notification_sync, broadcast_data_sync_sync
from ..services.task_service import (
    create_task,
    get_task_by_id,
    get_task_summary,
    list_tasks,
    update_task,
    update_task_status,
)
from ..services.user_service import assert_user_exists, get_user_by_id
from ..websocket.connection_manager import connection_manager

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task_endpoint(
    task_data: TaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TaskResponse:
    if current_user.role == UserRole.employee.value and task_data.assigned_to != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees may only create tasks for themselves.",
        )

    assignee = assert_user_exists(get_user_by_id(db, task_data.assigned_to))
    if assignee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found.")

    task = create_task(
        db,
        title=task_data.title,
        description=task_data.description,
        assigned_to=str(task_data.assigned_to),
        assigned_by=str(current_user.id),
        priority=task_data.priority,
        status=task_data.status,
        due_date=task_data.due_date,
    )

    notification = create_notification_event(
        db,
        user_id=task_data.assigned_to,
        title="New task assigned",
        message=f"A new task '{task.title}' has been assigned to you.",
        type="task_assigned",
        related_task_id=None,
    )

    notification_payload = {
        "type": "notification_event",
        "payload": {
            "id": str(notification.id),
            "user_id": str(notification.user_id),
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "related_task_id": None,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat(),
        },
    }

    background_tasks.add_task(
        send_notification_sync,
        str(task_data.assigned_to),
        notification_payload,
    )

    # Broadcast data sync event for real-time updates
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'task',
        'create',
        task.dict()
    )

    create_activity_log(
        db,
        user_id=str(current_user.id),
        action=f"Created task {task.id}",
        entity_type="task",
        entity_id=str(task.id),
    )
    return task


@router.get("", response_model=list[TaskResponse])
def list_tasks_endpoint(
    assigned_to: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[TaskResponse]:
    tasks = list_tasks(
        db,
        current_user_id=str(current_user.id),
        current_user_role=current_user.role,
        assigned_to=str(assigned_to) if assigned_to else None,
        status=status,
        skip=skip,
        limit=limit,
    )
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
def get_task_endpoint(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TaskResponse:
    task = get_task_by_id(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    if current_user.role == UserRole.employee.value and str(task.assigned_to) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this task.")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task_endpoint(
    task_id: int,
    task_data: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TaskResponse:
    task = get_task_by_id(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    if current_user.role == UserRole.employee.value and str(task.assigned_to) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to update this task.")

    if task_data.assigned_to is not None:
        assert_user_exists(get_user_by_id(db, task_data.assigned_to))

    updated_task = update_task(
        db,
        task,
        title=task_data.title,
        description=task_data.description,
        assigned_to=str(task_data.assigned_to) if task_data.assigned_to else None,
        priority=task_data.priority,
        status=task_data.status,
        due_date=task_data.due_date,
    )

    # Broadcast data sync event for real-time updates
    background_tasks.add_task(
        broadcast_data_sync_sync,
        'task',
        'update',
        updated_task.dict()
    )

    if task_data.assigned_to is not None and str(task_data.assigned_to) != str(task.assigned_to):
        notification = create_notification_event(
            db,
            user_id=task_data.assigned_to,
            title="Task reassigned",
            message=f"Task '{updated_task.title}' has been reassigned to you.",
            type="task_reassigned",
            related_task_id=None,
        )
        background_tasks.add_task(
            connection_manager.send_personal_message,
            str(task_data.assigned_to),
            {
                "type": "notification_event",
                "payload": {
                    "id": str(notification.id),
                    "user_id": str(notification.user_id),
                    "title": notification.title,
                    "message": notification.message,
                    "type": notification.type,
                    "related_task_id": None,
                    "is_read": notification.is_read,
                    "created_at": notification.created_at.isoformat(),
                },
            },
        )

    create_activity_log(
        db,
        user_id=str(current_user.id),
        action=f"Updated task {task.id}",
        entity_type="task",
        entity_id=str(task.id),
    )
    return updated_task


@router.patch("/{task_id}/status", response_model=TaskResponse)
def update_task_status_endpoint(
    task_id: int,
    status_update: TaskStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TaskResponse:
    task = get_task_by_id(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    if current_user.role == UserRole.employee.value and str(task.assigned_to) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to change this task.")

    updated_task = update_task_status(db, task, status_update.status)

    notification = create_notification_event(
        db,
        user_id=UUID(updated_task.assigned_to),
        title="Task status updated",
        message=f"The status for task '{updated_task.title}' has been changed to {updated_task.status}.",
        type="task_status_updated",
        related_task_id=None,
    )
    background_tasks.add_task(
        connection_manager.send_personal_message,
        str(updated_task.assigned_to),
        {
            "type": "notification_event",
            "payload": {
                "id": str(notification.id),
                "user_id": str(notification.user_id),
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "related_task_id": None,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
            },
        },
    )

    create_activity_log(
        db,
        user_id=str(current_user.id),
        action=f"Updated status of task {task.id} to {status_update.status}",
        entity_type="task",
        entity_id=str(task.id),
    )
    return updated_task


@router.get("/summary", response_model=TaskSummary)
def get_task_summary_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> TaskSummary:
    summary = get_task_summary(db, str(current_user.id), current_user.role)
    return TaskSummary(**summary)
