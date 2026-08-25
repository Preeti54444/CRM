import sys, os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.utils.security import create_access_token


def main():
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role.ilike('%admin%'), User.status=='active').first()
        if not admin:
            print('No active admin user found')
            return
        token = create_access_token(str(admin.id))
        client = TestClient(app)
        headers = {'Authorization': f'Bearer {token}'}
        resp = client.get('/api/admin/employees/list', headers=headers)
        print('status', resp.status_code)
        print(resp.text)
    finally:
        db.close()

if __name__ == '__main__':
    main()
