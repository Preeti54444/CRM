import sys, os, json
import traceback

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import requests
from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models.user import User
from app.utils.security import create_access_token


def main():
    out = {}
    try:
        # DB check
        with engine.connect() as conn:
            try:
                r = conn.execute(text("SELECT 1")).scalar()
                out['db_connection'] = True
                out['db_select_1'] = int(r)
            except Exception as e:
                out['db_connection'] = False
                out['db_error'] = str(e)

        # health
        try:
            h = requests.get('http://127.0.0.1:8085/health', timeout=5)
            out['health_status'] = h.status_code
            try:
                out['health_body'] = h.json()
            except Exception:
                out['health_body'] = h.text[:200]
        except Exception as e:
            out['health_status'] = 'error'
            out['health_error'] = str(e)

        # frontend static
        try:
            f = requests.get('http://127.0.0.1:8085/frontend/crm1.html', timeout=5)
            out['frontend_static'] = f.status_code
        except Exception as e:
            out['frontend_static'] = 'error'
            out['frontend_static_error'] = str(e)

        # find an active admin and create token
        db = SessionLocal()
        try:
            admin = db.query(User).filter(User.role.ilike('%admin%'), User.status=='active').first()
            if not admin:
                out['admin_found'] = False
            else:
                out['admin_found'] = True
                out['admin_email'] = admin.email
                token = create_access_token(str(admin.id))

                # call admin employees list with Origin header
                headers = {
                    'Authorization': f'Bearer {token}',
                    'Origin': 'http://127.0.0.1:3000'
                }
                try:
                    a = requests.get('http://127.0.0.1:8085/api/admin/employees/list', headers=headers, timeout=10)
                    out['admin_list_status'] = a.status_code
                    out['admin_list_length'] = len(a.json()) if a.status_code == 200 else None
                    out['admin_list_cors'] = a.headers.get('access-control-allow-origin') or a.headers.get('Access-Control-Allow-Origin')
                except Exception as e:
                    out['admin_list_status'] = 'error'
                    out['admin_list_error'] = str(e)
        finally:
            db.close()

    except Exception as e:
        out['script_error'] = str(e)
        out['traceback'] = traceback.format_exc()

    print(json.dumps(out, indent=2))

if __name__ == '__main__':
    main()
