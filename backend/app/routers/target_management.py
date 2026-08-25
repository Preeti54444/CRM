"""Target Management API Router"""
from datetime import date, datetime, time
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
import csv
import io
import json

from ..database import get_db
from ..models.user import User
from ..models.task import Task
from ..models.target_management import TargetEarlyLogoutRequest
from ..models.targets import Target
from ..schemas.target_management import (
    TodayTargetPanel,
    AdminEmployeeGridRow,
    AdminTargetKPIs,
    TargetLogoutCheckResponse,
    TargetEarlyLogoutCreate,
    TargetEarlyLogoutReview,
    TargetEarlyLogoutResponse,
    TargetAuditLogResponse,
    EmployeeBadgeResponse,
)
from ..schemas.targets import (
    AdminTargetAssignmentRequest,
    AdminTargetAssignmentResponse,
    EmployeeAssignedTargets,
)
from ..services.target_engine_service import TargetEngineService
from ..services.target_audit_service import TargetAuditService
from ..services.badge_service import BadgeService
from ..services.target_configuration_service import TargetConfigurationService
from ..services.performance_notification_service import PerformanceNotificationService
from ..auth.dependencies import get_current_user, require_admin, require_manager_or_admin


router = APIRouter(prefix="/targets", tags=["Target Management"])
api_router = APIRouter(prefix="/api/targets", tags=["Target Management"])

# Backward-compatible performance routes used by legacy frontend code
compat_router = APIRouter(prefix="/performance", tags=["Performance"])


def _verify_employee(user: User):
    if str(user.role).lower() != "employee":
        raise HTTPException(status_code=403, detail="Employee access only")


@router.get("/today", response_model=TodayTargetPanel)
async def get_today_target(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get Today's Target panel data (employee)"""
    _verify_employee(current_user)
    if not TargetConfigurationService.has_targets(current_user.full_name):
        raise HTTPException(status_code=404, detail="No targets configured for this employee")
    return TargetEngineService.get_today_target_panel(db, current_user.id, current_user.full_name)


@router.get("/live", response_model=TodayTargetPanel)
async def get_live_target(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Live target data - polled for real-time updates"""
    _verify_employee(current_user)
    if not TargetConfigurationService.has_targets(current_user.full_name):
        raise HTTPException(status_code=404, detail="No targets configured")
    return TargetEngineService.get_today_target_panel(db, current_user.id, current_user.full_name)


@router.post("/logout-check", response_model=TargetLogoutCheckResponse)
async def target_logout_check(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check logout eligibility based on targets + carry-forward"""
    _verify_employee(current_user)
    return TargetEngineService.check_logout(db, current_user.id, current_user.full_name)


@compat_router.post("/logout-check", response_model=TargetLogoutCheckResponse)
async def performance_logout_check_compat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Backward-compatible alias for /targets/logout-check"""
    if str(current_user.role).lower() != "employee":
        return TargetLogoutCheckResponse(
            can_logout=True,
            required_calls=0,
            required_leads=0,
            completed_calls=0,
            completed_leads=0,
            message="Non-employee users may logout freely.",
        )
    if not TargetConfigurationService.has_targets(current_user.full_name):
        return TargetLogoutCheckResponse(
            can_logout=True,
            required_calls=0,
            required_leads=0,
            completed_calls=0,
            completed_leads=0,
            message="No targets configured.",
        )
    return TargetEngineService.check_logout(db, current_user.id, current_user.full_name)


@router.post("/early-logout/request", response_model=TargetEarlyLogoutResponse)
async def request_target_early_logout(
    payload: TargetEarlyLogoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Request early logout due to pending targets"""
    _verify_employee(current_user)
    panel = TargetEngineService.get_today_target_panel(db, current_user.id, current_user.full_name)

    existing = db.query(TargetEarlyLogoutRequest).filter(
        TargetEarlyLogoutRequest.employee_id == current_user.id,
        TargetEarlyLogoutRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending request")

    req = TargetEarlyLogoutRequest(
        employee_id=current_user.id,
        reason=payload.reason,
        supporting_note=payload.supporting_note,
        remaining_calls=panel.calls_remaining,
        remaining_leads=panel.leads_remaining,
        carry_forward_calls=panel.carry_forward_calls,
        carry_forward_leads=panel.carry_forward_leads,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    TargetAuditService.log(
        db, action="logout_approval_requested", employee_id=current_user.id,
        entity_type="early_logout", entity_id=str(req.id),
        details=payload.reason,
    )

    admins = db.query(User).filter(User.role == "Admin").all()
    for admin in admins:
        PerformanceNotificationService.create_notification(
            db, admin.id,
            "Early Logout Request",
            f"{current_user.full_name} requests early logout: {payload.reason[:100]}",
            "target_logout_request",
        )

    return TargetEarlyLogoutResponse(
        id=req.id, employee_id=req.employee_id, employee_name=current_user.full_name,
        reason=req.reason, supporting_note=req.supporting_note, status=req.status,
        remaining_calls=req.remaining_calls, remaining_leads=req.remaining_leads,
        carry_forward_calls=req.carry_forward_calls, carry_forward_leads=req.carry_forward_leads,
        created_at=req.created_at,
    )


@router.get("/early-logout/pending", response_model=Optional[TargetEarlyLogoutResponse])
async def get_pending_target_logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(TargetEarlyLogoutRequest).filter(
        TargetEarlyLogoutRequest.employee_id == current_user.id,
        TargetEarlyLogoutRequest.status == "pending",
    ).first()
    if not req:
        return None
    return TargetEarlyLogoutResponse(
        id=req.id, employee_id=req.employee_id, employee_name=current_user.full_name,
        reason=req.reason, supporting_note=req.supporting_note, status=req.status,
        remaining_calls=req.remaining_calls, remaining_leads=req.remaining_leads,
        carry_forward_calls=req.carry_forward_calls, carry_forward_leads=req.carry_forward_leads,
        created_at=req.created_at,
    )


@router.get("/early-logout/requests", response_model=List[TargetEarlyLogoutResponse])
async def list_target_logout_requests(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = "pending",
):
    query = db.query(TargetEarlyLogoutRequest)
    if status_filter:
        query = query.filter(TargetEarlyLogoutRequest.status == status_filter)
    requests = query.order_by(TargetEarlyLogoutRequest.created_at.desc()).all()
    result = []
    for req in requests:
        emp = db.query(User).filter(User.id == req.employee_id).first()
        reviewer = db.query(User).filter(User.id == req.reviewer_id).first() if req.reviewer_id else None
        result.append(TargetEarlyLogoutResponse(
            id=req.id, employee_id=req.employee_id,
            employee_name=emp.full_name if emp else "Unknown",
            reason=req.reason, supporting_note=req.supporting_note, status=req.status,
            remaining_calls=req.remaining_calls, remaining_leads=req.remaining_leads,
            carry_forward_calls=req.carry_forward_calls, carry_forward_leads=req.carry_forward_leads,
            reviewer_name=reviewer.full_name if reviewer else None,
            reviewed_at=req.reviewed_at, review_comment=req.review_comment,
            created_at=req.created_at,
        ))
    return result


@api_router.get("/early-logout/pending", response_model=Optional[TargetEarlyLogoutResponse])
async def api_get_pending_target_logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await get_pending_target_logout(current_user=current_user, db=db)


@api_router.get("/early-logout/requests", response_model=List[TargetEarlyLogoutResponse])
async def api_list_target_logout_requests(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
    status_filter: Optional[str] = "pending",
):
    return await list_target_logout_requests(current_user=current_user, db=db, status_filter=status_filter)


@api_router.post("/early-logout/request", response_model=TargetEarlyLogoutResponse)
async def api_request_target_early_logout(
    payload: TargetEarlyLogoutCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await request_target_early_logout(payload=payload, current_user=current_user, db=db)


@api_router.post("/early-logout/review", response_model=TargetEarlyLogoutResponse)
async def api_review_target_logout(
    payload: TargetEarlyLogoutReview,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    return await review_target_logout(payload=payload, current_user=current_user, db=db)


@router.post("/early-logout/review", response_model=TargetEarlyLogoutResponse)
async def review_target_logout(
    payload: TargetEarlyLogoutReview,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    req = db.query(TargetEarlyLogoutRequest).filter(
        TargetEarlyLogoutRequest.id == payload.request_id
    ).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request already reviewed")

    from datetime import datetime
    req.status = payload.decision
    req.reviewer_id = current_user.id
    req.reviewed_at = datetime.utcnow()
    req.review_comment = payload.comment
    db.commit()
    db.refresh(req)

    action = "logout_approval_granted" if payload.decision == "approved" else "logout_approval_rejected"
    TargetAuditService.log(
        db, action=action, employee_id=req.employee_id, actor_id=current_user.id,
        entity_type="early_logout", entity_id=str(req.id),
        details=payload.comment or payload.decision,
    )

    emp = db.query(User).filter(User.id == req.employee_id).first()
    PerformanceNotificationService.create_notification(
        db, req.employee_id,
        f"Early Logout {payload.decision.title()}",
        f"Your early logout request has been {payload.decision} by {current_user.full_name}.",
        "target_logout_review",
    )

    return TargetEarlyLogoutResponse(
        id=req.id, employee_id=req.employee_id,
        employee_name=emp.full_name if emp else "Unknown",
        reason=req.reason, supporting_note=req.supporting_note, status=req.status,
        remaining_calls=req.remaining_calls, remaining_leads=req.remaining_leads,
        carry_forward_calls=req.carry_forward_calls, carry_forward_leads=req.carry_forward_leads,
        reviewer_name=current_user.full_name, reviewed_at=req.reviewed_at,
        review_comment=req.review_comment, created_at=req.created_at,
    )


@router.get("/admin/grid", response_model=List[AdminEmployeeGridRow])
async def get_admin_grid(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
    target_date: Optional[date] = None,
):
    return TargetEngineService.get_admin_employee_grid(db, target_date)


@router.get("/admin/kpis", response_model=AdminTargetKPIs)
async def get_admin_kpis(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
    target_date: Optional[date] = None,
):
    return TargetEngineService.get_admin_kpis(db, target_date)


@router.get("/admin/audit", response_model=List[TargetAuditLogResponse])
async def get_audit_trail(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
    employee_id: Optional[UUID] = None,
    action: Optional[str] = None,
    limit: int = 100,
):
    return TargetAuditService.get_logs(db, employee_id, action, limit)


@router.get("/badges", response_model=List[EmployeeBadgeResponse])
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BadgeService.get_employee_badges(db, current_user.id)


@router.get("/config")
async def get_target_config(
    current_user: User = Depends(get_current_user),
):
    if str(current_user.role).lower() == "employee":
        targets = TargetConfigurationService.get_targets_by_name(current_user.full_name)
        if not targets:
            raise HTTPException(status_code=404, detail="No targets configured")
        return {"employee_name": current_user.full_name, **targets}
    if current_user.role == "Admin":
        return TargetConfigurationService.get_all_employee_targets()
    raise HTTPException(status_code=403, detail="Access denied")


@router.get("/reports/daily")
async def get_daily_report(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
    report_date: Optional[date] = None,
):
    grid = TargetEngineService.get_admin_employee_grid(db, report_date)
    return {"date": str(report_date or date.today()), "employees": [r.model_dump() for r in grid]}


@compat_router.get("/employee/{employee_id}/daily")
async def performance_employee_daily_compat(
    employee_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    week_start: Optional[date] = None,
):
    """Backward-compatible daily performance endpoint for charts"""
    from ..models.employee_performance import EmployeePerformanceDaily
    query = db.query(EmployeePerformanceDaily).filter(
        EmployeePerformanceDaily.employee_id == employee_id
    )
    if week_start:
        from sqlalchemy import func
        query = query.filter(func.date(EmployeePerformanceDaily.date) >= week_start)
    records = query.order_by(EmployeePerformanceDaily.date.asc()).all()
    return [
        {
            "date": r.date,
            "calls_completed": r.calls_completed,
            "leads_created": r.leads_created,
            "achievement_percentage": r.achievement_percentage,
            "zone": r.zone,
        }
        for r in records
    ]


@compat_router.get("/weekly")
async def performance_weekly_compat(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    week_start: Optional[date] = None,
):
    """Backward-compatible weekly performance rankings"""
    from ..models.employee_performance import EmployeeWeeklyReport
    from sqlalchemy import func, and_
    if week_start is None:
        week_start, _ = TargetEngineService.get_week_range()
    reports = db.query(EmployeeWeeklyReport).filter(
        func.date(EmployeeWeeklyReport.week_start) == week_start
    ).order_by(EmployeeWeeklyReport.performance_score.desc()).all()
    result = []
    for report in reports:
        emp = db.query(User).filter(User.id == report.employee_id).first()
        result.append({
            "employee_id": str(report.employee_id),
            "employee_name": emp.full_name if emp else "Unknown",
            "performance_score": report.performance_score,
            "rank": report.rank,
            "zone": report.zone,
            "total_calls": report.total_calls,
            "total_leads": report.total_leads,
        })
    return result


@router.get("/reports/export")
async def export_report(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
    format: str = "csv",
    report_type: str = "daily",
):
    grid = TargetEngineService.get_admin_employee_grid(db)
    rows = [r.model_dump() for r in grid]

    TargetAuditService.log(
        db, action="report_generated", actor_id=current_user.id,
        details=f"Exported {report_type} report as {format}",
    )

    if format == "json":
        return rows
    if format == "csv":
        if not rows:
            return Response(content="", media_type="text/csv")
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        for row in rows:
            row["employee_id"] = str(row["employee_id"])
            if row.get("last_activity"):
                row["last_activity"] = str(row["last_activity"])
            writer.writerow(row)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=target_report.csv"},
        )
    raise HTTPException(status_code=400, detail="Unsupported format. Use csv or json.")


@router.post("/admin/assign-targets", response_model=AdminTargetAssignmentResponse)
async def admin_assign_employee_targets(
    payload: AdminTargetAssignmentRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to assign targets to an employee"""
    from datetime import datetime
    
    # Verify employee exists
    employee = db.query(User).filter(User.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if str(employee.role).lower() != "employee":
        raise HTTPException(status_code=400, detail="Target can only be assigned to employees")
    
    # Check if target already exists for this employee
    existing_target = db.query(Target).filter(Target.user_id == payload.employee_id).first()
    
    if existing_target:
        # Update existing target
        existing_target.daily_call_target = payload.daily_call_target
        existing_target.daily_lead_target = payload.daily_lead_target
        existing_target.weekly_lead_target = payload.weekly_lead_target or existing_target.weekly_lead_target
        existing_target.updated_by = current_user.id
        existing_target.updated_at = datetime.utcnow()
        existing_target.assigned_by = current_user.id
        existing_target.assigned_at = datetime.utcnow()
        existing_target.notification_sent = False
        db.commit()
        db.refresh(existing_target)
        target = existing_target
    else:
        # Create new target
        target = Target(
            user_id=payload.employee_id,
            role=str(employee.role),
            daily_call_target=payload.daily_call_target,
            daily_lead_target=payload.daily_lead_target,
            weekly_lead_target=payload.weekly_lead_target or 0,
            effective_from=payload.effective_from,
            updated_by=current_user.id,
            assigned_by=current_user.id,
            assigned_at=datetime.utcnow(),
            notification_sent=False,
        )
        db.add(target)
        db.commit()
        db.refresh(target)
    
    # Log audit trail
    TargetAuditService.log(
        db,
        action="target_assigned",
        employee_id=payload.employee_id,
        actor_id=current_user.id,
        entity_type="target_assignment",
        entity_id=str(target.id),
        details=f"Assigned targets - Daily Calls: {payload.daily_call_target}, Daily Leads: {payload.daily_lead_target}",
    )
    
    # Create notification for employee
    PerformanceNotificationService.create_notification(
        db,
        employee.id,
        "New Sales Targets Assigned",
        f"Your sales targets have been updated by admin. Daily: {payload.daily_call_target} calls, {payload.daily_lead_target} leads. Check 'My To-Do' for details.",
        "target_assigned",
    )

    # Create a todo task for the assigned employee so it appears in My To-Do
    task_title = "Review your new sales targets"
    task_description = (
        f"New sales targets assigned by admin: {payload.daily_call_target} calls, "
        f"{payload.daily_lead_target} leads."
    )
    task_due_date = datetime.combine(payload.effective_from, time(hour=17, minute=0))

    new_task = Task(
        title=task_title,
        description=task_description,
        assigned_to=employee.id,
        assigned_by=current_user.id,
        priority="high",
        due_date=task_due_date,
        status="pending",
    )
    db.add(new_task)
    db.commit()

    # Mark notification as sent
    target.notification_sent = True
    db.commit()
    db.refresh(target)
    
    return AdminTargetAssignmentResponse(
        id=target.id,
        employee_id=target.user_id,
        employee_name=employee.full_name,
        daily_call_target=target.daily_call_target,
        daily_lead_target=target.daily_lead_target,
        weekly_call_target=None,
        weekly_lead_target=target.weekly_lead_target,
        morning_call_target=payload.morning_call_target,
        morning_lead_target=payload.morning_lead_target,
        assigned_by=target.assigned_by,
        assigned_at=target.assigned_at,
        effective_from=target.effective_from,
        notification_sent=target.notification_sent,
    )


@router.get("/admin/employee/{employee_id}/assigned-targets", response_model=EmployeeAssignedTargets)
async def get_employee_assigned_targets(
    employee_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get assigned targets for a specific employee"""
    employee = db.query(User).filter(User.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    target = db.query(Target).filter(Target.user_id == employee_id).first()
    
    if not target:
        return EmployeeAssignedTargets(
            daily_calls=0,
            daily_leads=0,
            weekly_calls=None,
            weekly_leads=None,
            morning_calls=None,
            morning_leads=None,
            assigned_at=None,
            assigned_by_name=None,
        )
    
    assigned_by_user = None
    if target.assigned_by:
        assigned_by_user = db.query(User).filter(User.id == target.assigned_by).first()
    
    return EmployeeAssignedTargets(
        daily_calls=target.daily_call_target,
        daily_leads=target.daily_lead_target,
        weekly_calls=None,
        weekly_leads=target.weekly_lead_target,
        morning_calls=None,
        morning_leads=None,
        assigned_at=target.assigned_at,
        assigned_by_name=assigned_by_user.full_name if assigned_by_user else None,
    )


@router.get("/employee/my-assigned-targets", response_model=EmployeeAssignedTargets)
async def get_my_assigned_targets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get targets assigned to the current employee"""
    if str(current_user.role).lower() != "employee":
        raise HTTPException(status_code=403, detail="Employee access only")
    
    target = db.query(Target).filter(Target.user_id == current_user.id).first()
    
    if not target:
        return EmployeeAssignedTargets(
            daily_calls=0,
            daily_leads=0,
            weekly_calls=None,
            weekly_leads=None,
            morning_calls=None,
            morning_leads=None,
            assigned_at=None,
            assigned_by_name=None,
        )
    
    assigned_by_user = None
    if target.assigned_by:
        assigned_by_user = db.query(User).filter(User.id == target.assigned_by).first()
    
    return EmployeeAssignedTargets(
        daily_calls=target.daily_call_target,
        daily_leads=target.daily_lead_target,
        weekly_calls=None,
        weekly_leads=target.weekly_lead_target,
        morning_calls=None,
        morning_leads=None,
        assigned_at=target.assigned_at,
        assigned_by_name=assigned_by_user.full_name if assigned_by_user else None,
    )


@api_router.post("/admin/assign-targets", response_model=AdminTargetAssignmentResponse)
async def api_admin_assign_employee_targets(
    payload: AdminTargetAssignmentRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """API endpoint for admin to assign targets to an employee"""
    return await admin_assign_employee_targets(payload=payload, current_user=current_user, db=db)


@api_router.get("/admin/employee/{employee_id}/assigned-targets", response_model=EmployeeAssignedTargets)
async def api_get_employee_assigned_targets(
    employee_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """API endpoint to get assigned targets for a specific employee"""
    return await get_employee_assigned_targets(employee_id=employee_id, current_user=current_user, db=db)


@api_router.get("/employee/my-assigned-targets", response_model=EmployeeAssignedTargets)
async def api_get_my_assigned_targets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """API endpoint to get targets assigned to the current employee"""
    return await get_my_assigned_targets(current_user=current_user, db=db)
