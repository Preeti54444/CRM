from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
import io, csv
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_admin
from ..services.performance_service import compute_daily_for_date
from ..models.performance import EmployeePerformanceDaily, LogoutOverrideLog, EmployeeMidweekReport, EmployeeWeeklyReport
from ..models.targets import Target
from ..schemas.performance import LogoutOverrideCreate, LogoutOverrideRead
from ..schemas.performance import EmployeePerformanceDailyRead, EmployeeMidweekReportRead, EmployeeWeeklyReportRead

router = APIRouter(prefix="/performance", tags=["performance"])

@router.get('/daily/{date_str}', response_model=list[EmployeePerformanceDailyRead])
def get_daily_report(date_str: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    target_date = date.fromisoformat(date_str)
    rows = db.query(EmployeePerformanceDaily).filter(EmployeePerformanceDaily.date == target_date).all()
    return rows


@router.get('/midweek', response_model=list[EmployeeMidweekReportRead])
def get_midweek_reports(week_start: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    start = date.fromisoformat(week_start)
    rows = db.query(EmployeeMidweekReport).filter(EmployeeMidweekReport.week_start == start).all()
    return rows


@router.get('/weekly', response_model=list[EmployeeWeeklyReportRead])
def get_weekly_reports(week_start: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    start = date.fromisoformat(week_start)
    rows = db.query(EmployeeWeeklyReport).filter(EmployeeWeeklyReport.week_start == start).all()
    return rows


@router.get('/leaderboard')
def get_leaderboard(week_start: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    start = date.fromisoformat(week_start)
    rows = db.query(EmployeeWeeklyReport).filter(EmployeeWeeklyReport.week_start == start).order_by(EmployeeWeeklyReport.rank.asc()).all()
    return [{"employee_id": str(r.employee_id), "rank": r.rank, "score": r.performance_score} for r in rows]


@router.get('/employee/{employee_id}/daily')
def get_employee_daily(employee_id: str, week_start: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    start = date.fromisoformat(week_start)
    # week_start is start of week; collect 7 days
    rows = db.query(EmployeePerformanceDaily).filter(
        EmployeePerformanceDaily.employee_id == employee_id,
        EmployeePerformanceDaily.date >= start,
        EmployeePerformanceDaily.date <= (start + timedelta(days=6)),
    ).order_by(EmployeePerformanceDaily.date.asc()).all()
    return rows


@router.get('/employee/{employee_id}/weekly')
def get_employee_weekly(employee_id: str, week_start: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    start = date.fromisoformat(week_start)
    rows = db.query(EmployeeWeeklyReport).filter(EmployeeWeeklyReport.employee_id == employee_id, EmployeeWeeklyReport.week_start == start).all()
    return rows

router = APIRouter(prefix="/performance", tags=["performance"])


@router.post("/compute")
def compute_daily(date_str: str | None = None, db: Session = Depends(get_db), _=Depends(require_admin)):
    target_date = date.fromisoformat(date_str) if date_str else datetime.utcnow().date()
    results = compute_daily_for_date(db, target_date)
    return {"date": str(target_date), "results": results}


@router.post("/logout-check")
def logout_check(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    # Ensure daily record exists (compute on demand)
    today = datetime.utcnow().date()
    compute_daily_for_date(db, today)

    perf = (
        db.query(EmployeePerformanceDaily)
        .filter(EmployeePerformanceDaily.employee_id == current_user.id, EmployeePerformanceDaily.date == today)
        .one_or_none()
    )

    # Fetch targets
    target = db.query(Target).filter(Target.user_id == current_user.id).one_or_none()

    calls_required = target.daily_call_target if target else 0
    leads_required = target.daily_lead_target if target else 0

    calls_done = perf.calls_completed if perf else 0
    leads_done = perf.leads_created if perf else 0
    achievement = perf.achievement_percentage if perf else 0.0

    allowed = achievement >= 100.0

    return {
        "allowed": allowed,
        "calls_required": calls_required,
        "calls_done": calls_done,
        "leads_required": leads_required,
        "leads_done": leads_done,
        "achievement": achievement,
    }


@router.post("/admin-override", response_model=LogoutOverrideRead)
def admin_override(payload: LogoutOverrideCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    log = LogoutOverrideLog(
        employee_id=payload.employee_id,
        approved_by=payload.approved_by,
        reason=payload.reason,
        calls_completed=payload.calls_completed,
        leads_completed=payload.leads_completed,
        created_at=datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get('/export/weekly.csv')
def export_weekly_csv(week_start: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    start = date.fromisoformat(week_start)
    rows = db.query(EmployeeWeeklyReport).filter(EmployeeWeeklyReport.week_start == start).order_by(EmployeeWeeklyReport.rank.asc()).all()

    def iter_csv():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(['employee_id', 'employee_name', 'rank', 'performance_score', 'zone', 'notes'])
        yield buf.getvalue()
        buf.seek(0); buf.truncate(0)
        for r in rows:
            writer.writerow([str(r.employee_id), getattr(r, 'employee_name', ''), r.rank, r.performance_score, getattr(r, 'zone', ''), getattr(r, 'notes', '')])
            yield buf.getvalue()
            buf.seek(0); buf.truncate(0)

    return StreamingResponse(iter_csv(), media_type='text/csv', headers={'Content-Disposition': f'attachment; filename="weekly_{week_start}.csv"'})
