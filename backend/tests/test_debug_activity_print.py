from app.database import SessionLocal
from app.models.user import User
from app.routers.admin_employees import EmployeeActivityDTO


def test_print_employee_activity():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.role != 'Admin').all()
        print('Found', len(users), 'employees')
        for u in users:
            dto = EmployeeActivityDTO(u, db).to_dict()
            print('---')
            print('user:', u.email, 'id:', u.id)
            print('  loginTime:', dto.get('loginTime'))
            print('  lastActive:', dto.get('lastActive'))
            print('  workSeconds:', dto.get('workSeconds'))
            print('  breakSeconds:', dto.get('breakSeconds'))
    finally:
        db.close()
