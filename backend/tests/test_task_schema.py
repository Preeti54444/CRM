from datetime import datetime

from app.schemas.task import TaskResponse


def test_task_response_accepts_datetime_due_date_without_time_component():
    payload = {
        "id": 1,
        "title": "Test task",
        "description": None,
        "assigned_to": "00000000-0000-0000-0000-000000000001",
        "assigned_by": "00000000-0000-0000-0000-000000000002",
        "priority": "Normal",
        "status": "pending",
        "due_date": datetime(2026, 7, 22, 17, 0),
        "created_at": datetime(2026, 7, 21, 10, 0),
    }

    response = TaskResponse(**payload)

    assert response.due_date == datetime(2026, 7, 22, 17, 0).date()
