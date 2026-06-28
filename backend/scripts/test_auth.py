from app.database import SessionLocal
from app.services.user_service import create_user, get_user_by_email
from app.schemas.user import UserCreate, UserRole, UserStatus
from app.main import app
from starlette.testclient import TestClient


def main() -> None:
    admin_email = "admin@fundingsathi.com"
    with SessionLocal() as db:
        admin = get_user_by_email(db, admin_email)
        if not admin:
            admin = create_user(
                db,
                UserCreate(
                    full_name="FundingSathi Admin",
                    email=admin_email,
                    mobile="9999999999",
                    password="Admin@1234",
                    role=UserRole.admin,
                    department="Administration",
                    status=UserStatus.active,
                ),
            )
            print("admin_created", admin.id)
        else:
            print("admin_exists", admin.id)

    client = TestClient(app)
    login_res = client.post(
        "/auth/login",
        json={"email": admin_email, "password": "Admin@1234"},
    )
    print("login_status", login_res.status_code, login_res.json())
    if login_res.status_code == 200:
        token = login_res.json().get("access_token")
        me_res = client.get(
            "/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        print("me_status", me_res.status_code, me_res.json())
        users_res = client.get(
            "/users", headers={"Authorization": f"Bearer {token}"}
        )
        print("users_status", users_res.status_code, users_res.json())


if __name__ == "__main__":
    main()
