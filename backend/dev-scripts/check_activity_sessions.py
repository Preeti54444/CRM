from app.database import SessionLocal
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.models.work_session import WorkSession
from sqlalchemy import desc

s = SessionLocal()
try:
    users = s.query(User).filter(User.role != 'Admin').all()
    print('Found', len(users), 'non-admin users')
    for u in users:
        al = s.query(ActivityLog).filter(ActivityLog.user_id == u.id, ActivityLog.action == 'login').order_by(desc(ActivityLog.created_at)).first()
        ws = s.query(WorkSession).filter(WorkSession.created_by == u.id).order_by(desc(WorkSession.started_at)).first()
        print('---')
        print('user:', u.email, 'id:', u.id)
        print('  ActivityLog:', getattr(al,'created_at',None))
        if al:
            print('    action:', al.action, 'meta:', getattr(al,'meta',None))
        print('  WorkSession:', getattr(ws,'started_at',None), 'ended:', getattr(ws,'ended_at',None), 'duration_seconds:', getattr(ws,'duration_seconds',None))
finally:
    s.close()
