import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models.notification_event import NotificationEvent

uid = 'f1d124c5-1a1f-4c65-9d6d-860641f6654a'


db = SessionLocal()
try:
    existing = db.query(NotificationEvent).filter(NotificationEvent.user_id == uid).count()
    print(f'EXISTING_COUNT={existing}')
    if existing == 0:
        row = NotificationEvent(
            id=uuid.uuid4(),
            user_id=uid,
            title='Previous takeover request',
            message='Takeover request for lead: Shree Rathod - Previous lead review requires approval.',
            type='takeover_request',
            is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        print(f'INSERTED={row.id}')
    else:
        print('SKIPPED_INSERT=already_exists')
    final_count = db.query(NotificationEvent).filter(NotificationEvent.user_id == uid).count()
    print(f'FINAL_COUNT={final_count}')
finally:
    db.close()
