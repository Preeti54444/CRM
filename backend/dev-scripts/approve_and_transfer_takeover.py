from pathlib import Path
import sys
from datetime import datetime
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text
from app.database import engine

# IDs / emails
TAKEOVER_REQUEST_ID = 2
REVIEWER_EMAIL = 'shree.rathod@fundingsathi.in'

with engine.begin() as conn:
    # Fetch takeover request
    req = conn.execute(text('SELECT id, lead_id, requester_id, requester_name, request_reason, status FROM lead_takeover_requests WHERE id = :id'), {'id': TAKEOVER_REQUEST_ID}).first()
    if not req:
        print('Takeover request not found:', TAKEOVER_REQUEST_ID)
        raise SystemExit(1)
    print('Found request:', req)

    # Find reviewer user
    reviewer = conn.execute(text('SELECT id, full_name FROM users WHERE LOWER(email) = :email'), {'email': REVIEWER_EMAIL.lower()}).first()
    if not reviewer:
        print('Reviewer not found:', REVIEWER_EMAIL)
        raise SystemExit(1)
    reviewer_id = reviewer.id
    reviewer_name = reviewer.full_name
    print('Using reviewer:', reviewer_id, reviewer_name)

    # Approve request
    conn.execute(text('''
        UPDATE lead_takeover_requests SET status='approved', review_comment='Approved via dev script', reviewer_id=:rid, reviewer_name=:rname, reviewed_at=now(), updated_at=now()
        WHERE id = :id
    '''), {'rid': reviewer_id, 'rname': reviewer_name, 'id': TAKEOVER_REQUEST_ID})
    print('Marked request approved')

    # Now perform ownership transfer using service logic by importing app code

print('Now invoking OwnershipService.transfer_ownership')

# Use SQLAlchemy session to call the service
from app.database import SessionLocal
from app.services.ownership_service import OwnershipService
from app.models.lead_takeover_request import LeadTakeoverRequest

db = SessionLocal()
try:
    request = db.query(LeadTakeoverRequest).filter(LeadTakeoverRequest.id == TAKEOVER_REQUEST_ID).first()
    if not request:
        print('Request row disappeared')
        sys.exit(1)

    new_owner_id = str(request.requester_id)
    lead_id = request.lead_id
    transfer_reason = request.request_reason or 'Approved takeover'

    try:
        history = OwnershipService.transfer_ownership(
            lead_id=lead_id,
            new_owner_id=new_owner_id,
            transfer_reason=transfer_reason,
            db=db,
            current_user_id=str(reviewer_id)
        )
        print('Ownership transferred. History id:', history.id)
        print('Lead', lead_id, 'now assigned to', new_owner_id)
    except Exception as e:
        print('OwnershipService.transfer_ownership failed, falling back to manual transfer:', e)
        # Manual transfer: compute previous owner, last activity and days inactive, insert history and update lead
        from app.models.lead import Lead
        from app.models.lead_ownership import LeadOwnershipHistory

        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            print('Lead not found for manual transfer', lead_id)
            sys.exit(1)

        previous_owner_id = str(lead.assigned_to) if lead.assigned_to else None
        previous_owner_name = None
        if previous_owner_id:
            prev = db.execute(text('SELECT full_name, email FROM users WHERE id = :id'), {'id': previous_owner_id}).first()
            if prev:
                previous_owner_name = prev[0] or prev[1]

        new_owner = db.execute(text('SELECT full_name, email FROM users WHERE id = :id'), {'id': new_owner_id}).first()
        if not new_owner:
            print('New owner user row not found:', new_owner_id)
            sys.exit(1)
        new_owner_name = new_owner[0] or new_owner[1]

        # compute last activity date and days inactive similar to OwnershipService
        activity_dates = []
        if lead.last_call_date:
            activity_dates.append(lead.last_call_date)
        if lead.last_followup_date:
            activity_dates.append(lead.last_followup_date)
        if lead.last_remark_date:
            activity_dates.append(lead.last_remark_date)
        if lead.last_document_upload_date:
            activity_dates.append(lead.last_document_upload_date)
        if lead.last_meeting_date:
            activity_dates.append(lead.last_meeting_date)
        if lead.last_stage_change_date:
            activity_dates.append(lead.last_stage_change_date)

        last_activity_date = max(activity_dates) if activity_dates else (lead.created_at if lead.created_at else None)
        from datetime import datetime as _dt
        days_inactive = (_dt.utcnow() - last_activity_date).days if last_activity_date else None

        ownership_history = LeadOwnershipHistory(
            lead_id=lead_id,
            previous_owner_id=previous_owner_id,
            previous_owner_name=previous_owner_name,
            new_owner_id=new_owner_id,
            new_owner_name=new_owner_name,
            transfer_reason=transfer_reason,
            transfer_date=_dt.utcnow(),
            last_activity_date=last_activity_date,
            days_inactive=days_inactive
        )
        db.add(ownership_history)

        # Update lead
        lead.assigned_to = new_owner_id
        lead.ownership_locked = None
        lead.ownership_locked_by = None

        db.commit()
        db.refresh(ownership_history)
        print('Manual ownership transfer complete. History id:', ownership_history.id)
        print('Lead', lead_id, 'now assigned to', new_owner_id)
finally:
    db.close()
