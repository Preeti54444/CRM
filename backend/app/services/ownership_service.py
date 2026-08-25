from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.lead import Lead
from ..models.lead_ownership import LeadOwnershipHistory
from ..models.user import User


class OwnershipService:
    """Service for managing lead ownership and transfer logic"""
    
    @staticmethod
    def update_lead_activity(lead_id: int, activity_type: str, db: Session) -> None:
        """
        Update lead activity timestamp based on activity type
        Valid activity types: call, followup, remark, document, meeting, stage_update
        """
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return
        
        now = datetime.utcnow()
        
        if activity_type == "call":
            lead.last_call_date = now
        elif activity_type == "followup":
            lead.last_followup_date = now
        elif activity_type == "remark":
            lead.last_remark_date = now
        elif activity_type == "document":
            lead.last_document_upload_date = now
        elif activity_type == "meeting":
            lead.last_meeting_date = now
        elif activity_type == "stage_update":
            lead.last_stage_change_date = now
        
        # Update overall last activity date
        lead.last_activity_date = now.date()
        db.commit()
    
    @staticmethod
    def check_ownership_eligibility(lead_id: int, user_id: str, db: Session) -> Dict[str, Any]:
        """
        Check if a user is eligible to take ownership of a lead
        Returns eligibility status and reason
        """
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return {"eligible": False, "reason": "Lead not found"}
        
        # If lead is not assigned, anyone can take ownership
        if not lead.assigned_to:
            return {"eligible": True, "reason": "Lead is unassigned"}
        
        # If user is already the owner, they can maintain ownership
        if str(lead.assigned_to) == user_id:
            return {"eligible": True, "reason": "User is current owner"}

        lock_info = OwnershipService.get_lock_info(lead)
        if not lock_info["locked"]:
            return {
                "eligible": True,
                "reason": "Ownership is available due to inactivity",
                "days_inactive": lock_info.get("inactive_days"),
                "lock_info": lock_info,
            }

        return {
            "eligible": False,
            "reason": lock_info.get("reason", "Lead is actively owned by another user"),
            "current_owner": str(lead.assigned_to),
            "days_inactive": lock_info.get("inactive_days"),
            "lock_info": lock_info,
        }

    @staticmethod
    def get_last_activity_details(lead: Lead) -> tuple[Optional[datetime], Optional[str]]:
        """Return the latest activity datetime and its type."""
        activity_events = []
        if lead.last_call_date:
            activity_events.append(("Call", lead.last_call_date))
        if lead.last_followup_date:
            activity_events.append(("Follow-up", lead.last_followup_date))
        if lead.last_remark_date:
            activity_events.append(("Remark", lead.last_remark_date))
        if lead.last_document_upload_date:
            activity_events.append(("Document Upload", lead.last_document_upload_date))
        if lead.last_meeting_date:
            activity_events.append(("Meeting", lead.last_meeting_date))
        if lead.last_stage_change_date:
            activity_events.append(("Stage Update", lead.last_stage_change_date))

        if not activity_events:
            return None, None

        latest_type, latest_date = max(activity_events, key=lambda item: item[1])
        return latest_date, latest_type

    @staticmethod
    def get_lock_info(lead: Lead) -> Dict[str, Any]:
        """Compute takeover lock status based on recent activity."""
        last_activity_date, last_activity_type = OwnershipService.get_last_activity_details(lead)
        inactive_days = OwnershipService.get_days_inactive(lead)

        if last_activity_date is None:
            return {
                "locked": False,
                "reason": "No meaningful activity recorded",
                "inactive_days": None,
                "last_activity_type": None,
                "last_activity_date": None,
            }

        if inactive_days < 2:
            reason = "Too Early"
            locked = True
        elif inactive_days <= 30:
            reason = f"Day {inactive_days} of 30"
            locked = True
        else:
            reason = "30+ Days No Activity"
            locked = False

        return {
            "locked": locked,
            "reason": reason,
            "inactive_days": inactive_days,
            "last_activity_type": last_activity_type,
            "last_activity_date": last_activity_date.isoformat() if last_activity_date else None,
        }

    @staticmethod
    def get_lead_status(lead: Lead) -> str:
        """Derive Active/Inactive status for a lead."""
        status_value = None
        if lead.current_status:
            status_value = str(lead.current_status).strip().lower()
        if not status_value and lead.lead_status:
            status_value = str(lead.lead_status).strip().lower()

        if status_value == "inactive":
            return "Inactive"
        return "Active"

    @staticmethod
    def is_lead_inactive(lead: Lead, days: int = 30) -> bool:
        """Check if lead has been inactive for specified number of days"""
        if not lead:
            return False
        
        inactive_days = OwnershipService.get_days_inactive(lead)
        return inactive_days >= days
    
    @staticmethod
    def get_days_inactive(lead: Lead) -> int:
        """Get number of days since last meaningful activity"""
        if not lead:
            return 0
        
        # Get the most recent activity timestamp
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
        
        if not activity_dates:
            # If no activity recorded, use creation date
            if lead.created_at:
                activity_dates.append(lead.created_at)
            else:
                return 0
        
        most_recent_activity = max(activity_dates)
        # Convert date to datetime if needed for comparison
        if isinstance(most_recent_activity, date) and not isinstance(most_recent_activity, datetime):
            most_recent_activity = datetime.combine(most_recent_activity, datetime.min.time())
        
        # Ensure we're comparing datetime objects
        now = datetime.utcnow()
        if isinstance(most_recent_activity, date) and not isinstance(most_recent_activity, datetime):
            most_recent_activity = datetime.combine(most_recent_activity, datetime.min.time())
        
        days_inactive = (now - most_recent_activity).days
        
        return max(0, days_inactive)
    
    @staticmethod
    def transfer_ownership(
        lead_id: int,
        new_owner_id: str,
        transfer_reason: str,
        db: Session,
        current_user_id: str
    ) -> LeadOwnershipHistory:
        """
        Transfer ownership of a lead from current owner to new owner
        Records the transfer in ownership history
        """
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise ValueError("Lead not found")
        
        previous_owner_id = str(lead.assigned_to) if lead.assigned_to else None
        previous_owner_name = None
        
        # Get previous owner name
        if previous_owner_id:
            previous_owner = db.query(User).filter(User.id == previous_owner_id).first()
            if previous_owner:
                previous_owner_name = previous_owner.name or previous_owner.email
        
        # Get new owner name
        new_owner = db.query(User).filter(User.id == new_owner_id).first()
        if not new_owner:
            raise ValueError("New owner not found")
        new_owner_name = new_owner.name or new_owner.email
        
        # Calculate days inactive before transfer
        days_inactive = OwnershipService.get_days_inactive(lead)
        last_activity_date = None
        
        # Get last activity date
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
        
        if activity_dates:
            last_activity_date = max(activity_dates)
        
        # Create ownership history record
        ownership_history = LeadOwnershipHistory(
            lead_id=lead_id,
            previous_owner_id=previous_owner_id,
            previous_owner_name=previous_owner_name,
            new_owner_id=new_owner_id,
            new_owner_name=new_owner_name,
            transfer_reason=transfer_reason,
            transfer_date=datetime.utcnow(),
            last_activity_date=last_activity_date,
            days_inactive=days_inactive
        )
        
        # Update lead ownership
        lead.assigned_to = new_owner_id
        lead.ownership_locked = None  # Clear ownership lock
        lead.ownership_locked_by = None
        
        db.add(ownership_history)
        db.commit()
        db.refresh(ownership_history)
        
        return ownership_history
    
    @staticmethod
    def get_lead_ownership_history(lead_id: int, db: Session) -> list:
        """Get complete ownership history for a lead"""
        history = db.query(LeadOwnershipHistory).filter(
            LeadOwnershipHistory.lead_id == lead_id
        ).order_by(LeadOwnershipHistory.transfer_date.desc()).all()
        
        return [
            {
                "id": h.id,
                "previous_owner": h.previous_owner_name,
                "new_owner": h.new_owner_name,
                "transfer_reason": h.transfer_reason,
                "transfer_date": h.transfer_date.isoformat() if h.transfer_date else None,
                "days_inactive": h.days_inactive,
                "last_activity_date": h.last_activity_date.isoformat() if h.last_activity_date else None
            }
            for h in history
        ]
    
    @staticmethod
    def check_user_permissions(lead_id: int, user_id: str, db: Session) -> Dict[str, Any]:
        """
        Check what permissions a user has for a lead
        Returns permission level and allowed actions
        """
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return {"permission_level": "none", "allowed_actions": []}
        
        # If user is the owner, full permissions
        if str(lead.assigned_to) == user_id:
            return {
                "permission_level": "owner",
                "allowed_actions": [
                    "view", "edit", "delete", "change_stage", "change_owner",
                    "add_notes", "add_feedback", "add_meetings", "upload_documents",
                    "add_followups", "add_calls", "edit_all_fields"
                ]
            }
        
        # If ownership is available due to inactivity, allow takeover permissions
        lock_info = OwnershipService.get_lock_info(lead)
        if not lock_info["locked"]:
            return {
                "permission_level": "can_take_ownership",
                "allowed_actions": ["view", "take_ownership"],
                "reason": lock_info.get("reason", "Ownership available due to inactivity"),
                "lock_info": lock_info,
            }

        # Second person - restricted permissions (within 2-30 day window)
        inactive_days = lock_info.get("inactive_days") or 0
        return {
            "permission_level": "restricted",
            "allowed_actions": ["view", "add_notes", "add_feedback", "add_meetings"],
            "restricted_actions": [
                "edit", "delete", "change_stage", "change_owner",
                "upload_documents", "add_followups", "add_calls", "edit_all_fields"
            ],
            "reason": lock_info.get("reason", "Lead is actively owned by another user"),
            "days_until_takeover": max(0, 30 - inactive_days),
            "lock_info": lock_info,
        }
