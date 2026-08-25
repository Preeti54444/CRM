from app.database import SessionLocal
from app.models.user import User
from app.routers.admin_employees import EmployeeActivityDTO


def test_employee_activity_dto_works_with_live_database_schema():
    db = SessionLocal()
    try:
        user = db.query(User).order_by(User.created_at).first()
        assert user is not None

        payload = EmployeeActivityDTO(user, db).to_dict()

        assert payload["email"] == user.email
        assert payload["name"] == user.full_name
        assert "activity" in payload
        assert payload["activity"]["tasksAssigned"] >= 0
    finally:
        db.close()
