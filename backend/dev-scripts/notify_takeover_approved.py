from pathlib import Path
import sys
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.database import SessionLocal
from sqlalchemy import text
from app.services.notification_service import create_notification_event
from app.services.websocket_notification_service import send_notification_sync

TAKEOVER_REQUEST_ID = 2

db = SessionLocal()
try:
    # Get takeover request
    req = db.execute(text('SELECT id, lead_id, requester_id, requester_name FROM lead_takeover_requests WHERE id = :id'), {'id': TAKEOVER_REQUEST_ID}).first()
    if not req:
        print('Takeover request not found:', TAKEOVER_REQUEST_ID)
        sys.exit(1)

    req_id, lead_id, requester_id, requester_name = req[0], req[1], str(req[2]), req[3]

    title = f'Takeover Approved: Lead #{lead_id}'
    message = f'Your takeover request for lead #{lead_id} has been approved. You are now the owner.'

    notification = create_notification_event(db, user_id=requester_id, title=title, message=message, type='takeover_approved')
    print('Created notification id:', notification.id)

    payload = {
        'type': 'notification_event',
        'payload': {
            'id': str(notification.id),
            'user_id': str(notification.user_id),
            'title': notification.title,
            'message': notification.message,
            'type': notification.type,
            'related_task_id': str(notification.related_task_id) if notification.related_task_id else None,
            'is_read': notification.is_read,
            'created_at': notification.created_at.isoformat(),
        }
    }

    # Send via websocket sync wrapper
    send_notification_sync(requester_id, payload)
    print('Notification sent (attempted via websocket).')
finally:
    db.close()
