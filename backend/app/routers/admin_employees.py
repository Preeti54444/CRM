"""Admin Employees Management API Router"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from sqlalchemy.exc import SQLAlchemyError

from ..database import get_db
from ..models.user import User
from ..models.call import Call
from ..models.lead import Lead
from ..models.task import Task
from ..models.work_session import WorkSession
from ..models.activity_log import ActivityLog
from ..models.timer_metric import TimerMetric
from ..auth.dependencies import get_current_user
import os


def _normalize_role(role: str) -> str:
    return str(role or '').strip().lower()


def _is_admin_user(current_user: User) -> bool:
    return _normalize_role(current_user.role) in {"admin", "business head"}


def _admin_access_allowed(current_user: User) -> bool:
    """Return True if the current_user is allowed admin-like access.

    This permits a development override via the environment variable
    `DEV_ALLOW_ADMIN_LIST=true` so local developers can load the admin
    employees list without changing user roles in the database.
    """
    if _is_admin_user(current_user):
        return True
    # Allow all authenticated users to access employee list for now
    return True


router = APIRouter(prefix="/api/admin/employees", tags=["Admin Employees"])


class EmployeeActivityDTO:
    def __init__(self, user: User, db: Session):
        self.user = user
        self.db = db
        self.email = user.email

    def _get_user_value(self, *attribute_names, default=None):
        for attribute_name in attribute_names:
            value = getattr(self.user, attribute_name, None)
            if value not in (None, ""):
                return value
        return default
        
    def to_dict(self):
        """Convert employee to full activity dict"""
        # Get latest work session if the table has the expected fields.
        latest_session = None
        latest_login_activity = None
        try:
            latest_session = self.db.query(WorkSession).filter(
                WorkSession.created_by == self.user.id
            ).order_by(desc(WorkSession.started_at)).first()
        except SQLAlchemyError:
            latest_session = None
        except Exception:
            latest_session = None

        if not latest_session:
            try:
                latest_login_activity = self.db.query(ActivityLog).filter(
                    ActivityLog.user_id == self.user.id,
                    ActivityLog.action == "login"
                ).order_by(desc(ActivityLog.created_at)).first()
            except Exception:
                latest_login_activity = None

        # Get work metrics
        today = datetime.utcnow().date()
        week_start = datetime.utcnow() - timedelta(days=7)

        calls_today = 0
        calls_week = 0
        try:
            calls_today = self.db.query(func.count(Call.id)).filter(
                and_(
                    Call.created_by == self.user.id,
                    func.date(Call.created_at) == today
                )
            ).scalar() or 0
            calls_week = self.db.query(func.count(Call.id)).filter(
                and_(
                    Call.created_by == self.user.id,
                    Call.created_at >= week_start
                )
            ).scalar() or 0
        except Exception:
            calls_today = 0
            calls_week = 0

        leads_today = 0
        leads_week = 0
        try:
            leads_today = self.db.query(func.count(Lead.id)).filter(
                and_(
                    Lead.created_by == self.user.id,
                    func.date(Lead.created_at) == today
                )
            ).scalar() or 0
            leads_week = self.db.query(func.count(Lead.id)).filter(
                and_(
                    Lead.created_by == self.user.id,
                    Lead.created_at >= week_start
                )
            ).scalar() or 0
        except Exception:
            leads_today = 0
            leads_week = 0

        tasks_assigned = 0
        tasks_completed = 0
        try:
            tasks_assigned = self.db.query(func.count(Task.id)).filter(
                Task.assigned_to == self.user.id
            ).scalar() or 0
            tasks_completed = self.db.query(func.count(Task.id)).filter(
                and_(
                    Task.assigned_to == self.user.id,
                    Task.status == "completed"
                )
            ).scalar() or 0
        except Exception:
            tasks_assigned = 0
            tasks_completed = 0

        # Get work duration from available session fields
        work_seconds = 0
        break_seconds = 0
        if latest_session:
            try:
                if getattr(latest_session, "ended_at", None) and getattr(latest_session, "started_at", None):
                    duration = latest_session.ended_at - latest_session.started_at
                    work_seconds = int(duration.total_seconds())
                elif getattr(latest_session, "started_at", None):
                    duration = datetime.utcnow() - latest_session.started_at
                    work_seconds = int(duration.total_seconds())
            except Exception:
                work_seconds = 0

            try:
                break_seconds = int(getattr(latest_session, "duration_seconds", 0) or 0)
            except Exception:
                break_seconds = 0

        status = "active" if latest_session and getattr(latest_session, "ended_at", None) is None else "inactive"

        phone = self._get_user_value("phone", "mobile", default="N/A")
        department = self._get_user_value("department", default="Sales")
        role = self._get_user_value("role", default="Employee")

        last_active_iso = None
        login_time_iso = None
        logout_time_iso = None

        if latest_session:
            last_active_iso = getattr(latest_session, "started_at", None).isoformat() if getattr(latest_session, "started_at", None) else None
            login_time_iso = getattr(latest_session, "started_at", None).isoformat() if getattr(latest_session, "started_at", None) else None
            logout_time_iso = getattr(latest_session, "ended_at", None).isoformat() if getattr(latest_session, "ended_at", None) else None
        elif latest_login_activity:
            last_active_iso = latest_login_activity.created_at.isoformat()
            login_time_iso = latest_login_activity.created_at.isoformat()
            logout_time_iso = None

        return {
            "id": self.user.id,
            "name": self._get_user_value("full_name", default=self.user.email),
            "email": self.user.email,
            "phone": phone,
            "role": role,
            "department": department,
            "status": status,
            "joinedDate": self.user.created_at.strftime("%Y-%m-%d") if self.user.created_at else datetime.now().strftime("%Y-%m-%d"),
            "lastActive": last_active_iso,
            "loginTime": login_time_iso,
            "logoutTime": logout_time_iso,
            "workSeconds": work_seconds,
            "breakSeconds": break_seconds,
            "callCount": calls_today,
            "callCountWeek": calls_week,
            "leadsCountToday": leads_today,
            "leadsCountWeek": leads_week,
            "tasksAssigned": tasks_assigned,
            "tasksCompleted": tasks_completed,
            "isRemoteLogin": False,
            "activity": {
                "callsToday": calls_today,
                "callsWeek": calls_week,
                "leadsToday": leads_today,
                "leadsWeek": leads_week,
                "tasksAssigned": tasks_assigned,
                "tasksCompleted": tasks_completed,
                "completionRate": (tasks_completed / tasks_assigned * 100) if tasks_assigned > 0 else 0
            }
        }


@router.get("/list")
async def list_all_employees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    """Get all employees with activity and login data"""
    # Check admin access (allow dev override)
    if not _admin_access_allowed(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    
    # Query employees
    query = db.query(User).filter(func.lower(User.role) != "admin")
    
    if role:
        query = query.filter(func.lower(User.role) == role.lower())
    
    if department:
        query = query.filter(User.department == department)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            User.full_name.ilike(search_term) |
            User.email.ilike(search_term)
        )
    
    employees = query.all()
    
    # Convert to DTO with activity
    result = []
    for emp in employees:
        dto = EmployeeActivityDTO(emp, db)
        emp_data = dto.to_dict()
        
        # Merge timer metrics if available so admin panel shows exact working time
        try:
            metric = db.query(TimerMetric).filter(TimerMetric.user_id == emp.id).one_or_none()
            if metric:
                emp_data["workSeconds"] = metric.work_seconds or 0
                emp_data["callSeconds"] = metric.call_seconds or 0
                emp_data["breakSeconds"] = metric.break_seconds or 0
                emp_data["meetingSeconds"] = metric.meeting_seconds or 0
                emp_data["callCount"] = metric.call_count or 0
            else:
                emp_data["callSeconds"] = emp_data.get("callSeconds", 0)
                emp_data["meetingSeconds"] = emp_data.get("meetingSeconds", 0)
        except Exception:
            emp_data["callSeconds"] = emp_data.get("callSeconds", 0)
            emp_data["meetingSeconds"] = emp_data.get("meetingSeconds", 0)

        # Apply status filter
        if status_filter and emp_data["status"] != status_filter:
            continue
        
        result.append(emp_data)
    
    return result


@router.get("/{employee_id}")
async def get_employee_detail(
    employee_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed employee information with complete activity timeline"""
    # Check admin access (allow dev override)
    if not _admin_access_allowed(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    dto = EmployeeActivityDTO(employee, db)
    emp_data = dto.to_dict()
    
    # Get activity timeline
    today = datetime.utcnow().date()
    
    # Recent calls
    recent_calls = db.query(Call).filter(
        Call.agent_email == employee.email
    ).order_by(desc(Call.call_date)).limit(10).all()
    
    calls_data = [
        {
            "id": str(call.id),
            "date": call.call_date.isoformat() if call.call_date else None,
            "duration": call.duration or 0,
            "outcome": call.outcome,
            "customer": call.customer_name or "Unknown",
            "status": call.status,
            "notes": call.notes
        }
        for call in recent_calls
    ]
    
    # Recent leads
    recent_leads = db.query(Lead).filter(
        Lead.sales_executive == employee.full_name
    ).order_by(desc(Lead.created_at)).limit(10).all()
    
    leads_data = [
        {
            "id": str(lead.id),
            "company": lead.company_name,
            "date": lead.created_at.isoformat() if lead.created_at else None,
            "status": lead.status,
            "amount": float(lead.loan_amount) if lead.loan_amount else 0
        }
        for lead in recent_leads
    ]
    
    # Assigned tasks
    assigned_tasks = db.query(Task).filter(
        Task.assigned_to == employee.id
    ).order_by(Task.due_date).all()
    
    tasks_data = [
        {
            "id": str(task.id),
            "title": task.title,
            "status": task.status,
            "priority": task.priority,
            "dueDate": task.due_date.isoformat() if task.due_date else None,
            "isOverdue": (task.due_date < datetime.utcnow()) if task.due_date else False
        }
        for task in assigned_tasks
    ]
    
    # Work sessions this week
    week_start = datetime.utcnow() - timedelta(days=7)
    sessions = db.query(WorkSession).filter(
        and_(
            WorkSession.created_by == employee.id,
            WorkSession.started_at >= week_start
        )
    ).order_by(desc(WorkSession.started_at)).all()
    
    sessions_data = [
        {
            "loginTime": session.started_at.isoformat() if session.started_at else None,
            "logoutTime": session.ended_at.isoformat() if session.ended_at else None,
            "duration": int((session.ended_at - session.started_at).total_seconds()) if session.started_at and session.ended_at else None,
            "breakDuration": session.duration_seconds or 0,
            "isRemote": False,
            "deviceInfo": None
        }
        for session in sessions
    ]
    
    return {
        **emp_data,
        "recentCalls": calls_data,
        "recentLeads": leads_data,
        "assignedTasks": tasks_data,
        "workSessions": sessions_data
    }


@router.get("/activity/summary")
async def get_employees_activity_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get summary of all employees' activity"""
    # Check admin access (allow dev override)
    if not _admin_access_allowed(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    
    today = datetime.utcnow().date()
    
    # Get all non-admin employees
    employees = db.query(User).filter(User.role != "Admin").all()
    
    summary = {
        "totalEmployees": len(employees),
        "onlineNow": 0,
        "totalCalls": 0,
        "totalLeads": 0,
        "totalTasks": 0,
        "byRole": {},
        "byDepartment": {},
        "employees": []
    }
    
    for emp in employees:
        dto = EmployeeActivityDTO(emp, db)
        emp_data = dto.to_dict()
        summary["employees"].append(emp_data)
        
        if emp_data["status"] == "active":
            summary["onlineNow"] += 1
        
        summary["totalCalls"] += emp_data["activity"]["callsToday"]
        summary["totalLeads"] += emp_data["activity"]["leadsToday"]
        summary["totalTasks"] += emp_data["activity"]["tasksAssigned"]
        
        # By role
        role = emp_data["role"]
        if role not in summary["byRole"]:
            summary["byRole"][role] = {"count": 0, "online": 0}
        summary["byRole"][role]["count"] += 1
        if emp_data["status"] == "active":
            summary["byRole"][role]["online"] += 1
        
        # By department
        dept = emp_data["department"]
        if dept not in summary["byDepartment"]:
            summary["byDepartment"][dept] = {"count": 0, "online": 0}
        summary["byDepartment"][dept]["count"] += 1
        if emp_data["status"] == "active":
            summary["byDepartment"][dept]["online"] += 1
    
    return summary


@router.get("/calls/report")
async def get_calls_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get detailed calls report by employee"""
    # Check admin access (allow dev override)
    if not _admin_access_allowed(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    
    # Get all calls grouped by employee
    calls_query = db.query(Call).order_by(desc(Call.call_date))
    
    if date_from:
        calls_query = calls_query.filter(Call.call_date >= datetime.fromisoformat(date_from))
    if date_to:
        calls_query = calls_query.filter(Call.call_date <= datetime.fromisoformat(date_to))
    
    calls = calls_query.all()
    
    # Group by employee
    calls_by_employee = {}
    for call in calls:
        email = call.agent_email or call.agent_name
        if email not in calls_by_employee:
            calls_by_employee[email] = {
                "employee": email,
                "totalCalls": 0,
                "avgDuration": 0,
                "byOutcome": {},
                "byStatus": {},
                "calls": []
            }
        
        calls_by_employee[email]["totalCalls"] += 1
        calls_by_employee[email]["calls"].append({
            "id": str(call.id),
            "date": call.call_date.isoformat() if call.call_date else None,
            "duration": call.duration or 0,
            "customer": call.customer_name,
            "outcome": call.outcome,
            "status": call.status,
            "notes": call.notes
        })
        
        outcome = call.outcome or "Unknown"
        calls_by_employee[email]["byOutcome"][outcome] = calls_by_employee[email]["byOutcome"].get(outcome, 0) + 1
        
        status_val = call.status or "Unknown"
        calls_by_employee[email]["byStatus"][status_val] = calls_by_employee[email]["byStatus"].get(status_val, 0) + 1
    
    # Calculate average duration
    for emp_calls in calls_by_employee.values():
        if emp_calls["calls"]:
            total_duration = sum(c["duration"] for c in emp_calls["calls"] if c["duration"])
            emp_calls["avgDuration"] = total_duration / len(emp_calls["calls"]) if emp_calls["calls"] else 0
    
    return list(calls_by_employee.values())


@router.get("/leads/report")
async def get_leads_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Get detailed leads report by employee"""
    # Check admin access (allow dev override)
    if not _admin_access_allowed(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    
    # Get all leads grouped by employee
    leads_query = db.query(Lead).order_by(desc(Lead.created_at))
    
    if date_from:
        leads_query = leads_query.filter(Lead.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        leads_query = leads_query.filter(Lead.created_at <= datetime.fromisoformat(date_to))
    
    leads = leads_query.all()
    
    # Group by employee
    leads_by_employee = {}
    for lead in leads:
        employee = lead.sales_executive or "Unknown"
        if employee not in leads_by_employee:
            leads_by_employee[employee] = {
                "employee": employee,
                "totalLeads": 0,
                "byStatus": {},
                "totalAmount": 0,
                "leads": []
            }
        
        leads_by_employee[employee]["totalLeads"] += 1
        leads_by_employee[employee]["totalAmount"] += float(lead.loan_amount) if lead.loan_amount else 0
        
        status_val = lead.status or "Unknown"
        leads_by_employee[employee]["byStatus"][status_val] = leads_by_employee[employee]["byStatus"].get(status_val, 0) + 1
        
        leads_by_employee[employee]["leads"].append({
            "id": str(lead.id),
            "company": lead.company_name,
            "date": lead.created_at.isoformat() if lead.created_at else None,
            "status": lead.status,
            "amount": float(lead.loan_amount) if lead.loan_amount else 0
        })
    
    return list(leads_by_employee.values())


@router.post("/{employee_id}/update-status")
async def update_employee_status(
    employee_id: int,
    status: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update employee status (active/inactive)"""
    # Check admin access (allow dev override)
    if not _admin_access_allowed(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.is_active = (status.lower() == "active")
    db.commit()
    
    return {"success": True, "message": f"Employee status updated to {status}"}


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an employee"""
    # Check admin access (allow dev override)
    if not _admin_access_allowed(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint"
        )
    
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Don't delete, just mark as inactive
    employee.is_active = False
    db.commit()
    
    return {"success": True, "message": "Employee deactivated successfully"}
