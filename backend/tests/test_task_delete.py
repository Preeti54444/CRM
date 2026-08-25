from fastapi import BackgroundTasks

from app.routers import tasks as tasks_router_module
from app.schemas.user import UserRole


class DummyDB:
    def __init__(self) -> None:
        self.deleted = None
        self.committed = False

    def delete(self, task) -> None:
        self.deleted = task

    def commit(self) -> None:
        self.committed = True


class DummyUser:
    id = "00000000-0000-0000-0000-000000000001"
    role = UserRole.admin.value


def test_delete_task_endpoint_succeeds_when_task_is_already_missing(monkeypatch):
    monkeypatch.setattr(tasks_router_module, "get_task_by_id", lambda db, task_id: None)
    monkeypatch.setattr(tasks_router_module, "create_activity_log", lambda *args, **kwargs: None)

    db = DummyDB()
    current_user = DummyUser()

    response = tasks_router_module.delete_task_endpoint(
        task_id=123,
        background_tasks=BackgroundTasks(),
        db=db,
        current_user=current_user,
    )

    assert response == {"detail": "deleted"}
