from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models.user import User
from app.services.notification_service import get_admin_notification_recipients


def _build_session():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    return Session(engine)


def test_get_admin_notification_recipients_uses_active_admin_and_manager_users():
    session = _build_session()
    try:
        admin_user = User(
            id=uuid4(),
            full_name='Admin User',
            email='admin@example.com',
            password_hash='hash',
            role='Admin',
            status='active',
        )
        manager_user = User(
            id=uuid4(),
            full_name='Manager User',
            email='manager@example.com',
            password_hash='hash',
            role='Manager',
            status='active',
        )
        employee_user = User(
            id=uuid4(),
            full_name='Employee User',
            email='employee@example.com',
            password_hash='hash',
            role='Employee',
            status='active',
        )
        inactive_admin = User(
            id=uuid4(),
            full_name='Inactive Admin',
            email='inactive-admin@example.com',
            password_hash='hash',
            role='Admin',
            status='inactive',
        )

        session.add_all([admin_user, manager_user, employee_user, inactive_admin])
        session.commit()

        recipients = get_admin_notification_recipients(session)
        ids = {str(user.id) for user in recipients}

        assert ids == {str(admin_user.id), str(manager_user.id)}
    finally:
        session.close()


def test_get_admin_notification_recipients_accepts_lowercase_roles():
    session = _build_session()
    try:
        admin_user = User(
            id=uuid4(),
            full_name='Lowercase Admin User',
            email='lower-admin@example.com',
            password_hash='hash',
            role='admin',
            status='active',
        )
        manager_user = User(
            id=uuid4(),
            full_name='Lowercase Manager User',
            email='lower-manager@example.com',
            password_hash='hash',
            role='manager',
            status='active',
        )
        employee_user = User(
            id=uuid4(),
            full_name='Employee User',
            email='employee@example.com',
            password_hash='hash',
            role='employee',
            status='active',
        )

        session.add_all([admin_user, manager_user, employee_user])
        session.commit()

        recipients = get_admin_notification_recipients(session)
        ids = {str(user.id) for user in recipients}

        assert ids == {str(admin_user.id), str(manager_user.id)}
    finally:
        session.close()
