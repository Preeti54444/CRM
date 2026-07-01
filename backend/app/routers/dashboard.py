from typing import Dict
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin, require_admin
from ..models.lead import Lead
from ..models.followup import FollowUp

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/admin", response_model=Dict[str, int])
def admin_dashboard(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    total_leads = db.query(func.count(Lead.id)).scalar() or 0
    active_leads = db.query(func.count(Lead.id)).filter(Lead.lead_status != "Closed").scalar() or 0
    disbursed_leads = db.query(func.count(Lead.id)).filter(Lead.lead_status == "Disbursed").scalar() or 0
    total_followups = db.query(func.count(FollowUp.id)).scalar() or 0
    overdue_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.status == "overdue").scalar() or 0
    return {
        "total_leads": total_leads,
        "active_leads": active_leads,
        "disbursed_leads": disbursed_leads,
        "total_followups": total_followups,
        "overdue_followups": overdue_followups,
    }


@router.get("/manager", response_model=Dict[str, int])
def manager_dashboard(db: Session = Depends(get_db), current_user=Depends(require_manager_or_admin)):
    # team-level KPIs: leads assigned to manager's team is approximated by assigned_to==manager
    team_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == current_user.id).scalar() or 0
    team_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.assigned_to == current_user.id).scalar() or 0
    return {"team_leads": team_leads, "team_followups": team_followups}


@router.get("/employee", response_model=Dict[str, int])
def employee_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    my_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == current_user.id).scalar() or 0
    my_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.assigned_to == current_user.id).scalar() or 0
    return {"my_leads": my_leads, "my_followups": my_followups}


@router.get("/stats", response_model=Dict[str, int])
def dashboard_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Generic dashboard stats endpoint that returns counts based on user role"""
    # For admins and managers, return total counts
    if current_user.role in ["admin", "manager"]:
        total_leads = db.query(func.count(Lead.id)).scalar() or 0
        active_leads = db.query(func.count(Lead.id)).filter(Lead.lead_status != "Closed").scalar() or 0
        total_followups = db.query(func.count(FollowUp.id)).scalar() or 0
        return {
            "total_leads": total_leads,
            "active_leads": active_leads,
            "total_followups": total_followups,
        }
    # For employees, return only their assigned leads
    else:
        my_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == current_user.id).scalar() or 0
        my_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.assigned_to == current_user.id).scalar() or 0
        return {
            "total_leads": my_leads,
            "active_leads": my_leads,
            "total_followups": my_followups,
        }
