from pathlib import Path
import sys
from datetime import date, datetime, time, timezone

# Ensure backend package imports work when running from the scripts folder
ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import SessionLocal
from app.models.user import User
from app.models.targets import Target
from app.schemas.user import UserRole
from app.services.user_service import get_user_by_email
from app.utils.security import hash_password

TARGETS_TO_SEED = [
    {
        'user_email': 'saleem.k@fundingsathi.in',
        'role': 'Manager',
        'daily_call_target': 25,
        'daily_lead_target': 2,
        'weekly_lead_target': 0,
        'crm_log_deadline': time(hour=19, minute=0),
        'effective_from': date.today(),
    },
    {
        'user_email': 'vaibhav.borge@fundingsathi.in',
        'role': 'Sales',
        'daily_call_target': 30,
        'daily_lead_target': 3,
        'weekly_lead_target': 15,
        'crm_log_deadline': time(hour=19, minute=0),
        'effective_from': date.today(),
    },
    {
        'user_email': 'roshan.chavan@fundingsathi.in',
        'role': 'Ops+Sales',
        'daily_call_target': 25,
        'daily_lead_target': 2,
        'weekly_lead_target': 10,
        'crm_log_deadline': time(hour=19, minute=0),
        'effective_from': date.today(),
    },
]

USERS_TO_SEED = [
    {
        'full_name': 'Shree Rathod',
        'email': 'shree.rathod@fundingsathi.in',
        'password': 'shree.admin@2026',
        'role': UserRole.admin.value,
        'department': 'Sales',
    },
    {
        'full_name': 'Vaibhav Borge',
        'email': 'vaibhav.borge@fundingsathi.in',
        'password': 'vaibhav.emp@01',
        'role': UserRole.employee.value,
        'department': 'Sales',
    },
    {
        'full_name': 'Roshan Chavan',
        'email': 'roshan.chavan@fundingsathi.in',
        'password': 'roshan.emp@02',
        'role': UserRole.employee.value,
        'department': 'Sales',
    },
    {
        'full_name': 'Saleem Khan',
        'email': 'saleem.k@fundingsathi.in',
        'password': 'saleem.emp@03',
        'role': UserRole.employee.value,
        'department': 'Sales',
    },
    {
        'full_name': 'Corporate User',
        'email': 'corporate@fundingsathi.in',
        'password': 'emp789',
        'role': UserRole.employee.value,
        'department': 'Corporate',
    },
]


def seed_user(db, user_data: dict) -> None:
    existing = get_user_by_email(db, user_data['email'])
    if existing:
        print(f'Updating existing user: {user_data["email"]}')
        existing.full_name = user_data['full_name']
        existing.password_hash = hash_password(user_data['password'])
        existing.role = user_data['role']
        existing.department = user_data['department']
        existing.status = 'active'
        existing.updated_at = datetime.now(timezone.utc)
        db.add(existing)
        db.commit()
        return

    new_user = User(
        full_name=user_data['full_name'],
        email=user_data['email'].lower().strip(),
        password_hash=hash_password(user_data['password']),
        role=user_data['role'],
        department=user_data['department'],
        status='active',
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    print(f'Created user: {user_data["email"]}')


def main() -> None:
    db = SessionLocal()
    try:
        for user_data in USERS_TO_SEED:
            seed_user(db, user_data)
        seed_targets(db)
        print('User and target seeding complete.')
    except Exception as exc:
        print('Error seeding users or targets:', exc)
    finally:
        db.close()


def seed_target(db, target_data: dict, updated_by_id):
    user = get_user_by_email(db, target_data['user_email'])
    if not user:
        print(f"Skipping target seed, user not found: {target_data['user_email']}")
        return

    existing_target = db.query(Target).filter(Target.user_id == user.id).first()
    if existing_target:
        existing_target.role = target_data['role']
        existing_target.daily_call_target = target_data['daily_call_target']
        existing_target.daily_lead_target = target_data['daily_lead_target']
        existing_target.weekly_lead_target = target_data['weekly_lead_target']
        existing_target.crm_log_deadline = target_data['crm_log_deadline']
        existing_target.effective_from = target_data['effective_from']
        existing_target.updated_by = updated_by_id
        existing_target.updated_at = datetime.now(timezone.utc)
        db.add(existing_target)
        db.commit()
        print(f"Updated target for user: {target_data['user_email']}")
        return

    new_target = Target(
        user_id=user.id,
        role=target_data['role'],
        daily_call_target=target_data['daily_call_target'],
        daily_lead_target=target_data['daily_lead_target'],
        weekly_lead_target=target_data['weekly_lead_target'],
        crm_log_deadline=target_data['crm_log_deadline'],
        effective_from=target_data['effective_from'],
        updated_by=updated_by_id,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_target)
    db.commit()
    print(f"Created target for user: {target_data['user_email']}")


def seed_targets(db):
    admin_user = db.query(User).filter(User.role == UserRole.admin.value).first()
    if not admin_user:
        admin_user = db.query(User).first()
    if not admin_user:
        print('No users available to assign as updated_by for targets.')
        return

    for target_data in TARGETS_TO_SEED:
        seed_target(db, target_data, admin_user.id)


if __name__ == '__main__':
    main()
