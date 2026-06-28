from typing import Any, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas import ReportResponse
from ..schemas.user import UserRole
from ..services.notification_service import create_notification_event
from ..services.typed_report_service import (
    create_eod_report,
    create_sod_report,
    create_wod_report,
    list_eod_reports as list_eod_reports_service,
    list_sod_reports as list_sod_reports_service,
    list_wod_reports as list_wod_reports_service,
)
from ..services.user_service import get_users
from ..services.websocket_notification_service import send_notification_sync

router = APIRouter(prefix="", tags=["reports"])

def _notify_report_submission(
    db: Session,
    background_tasks: BackgroundTasks,
    report_type: str,
    creator_id: str,
    creator_name: str,
) -> None:
    recipients = [
        user for user in get_users(db)
        if user.role in {UserRole.admin.value, UserRole.manager.value} and str(user.id) != str(creator_id)
    ]

    if not recipients:
        return

    title = f"New {report_type.upper()} report submitted"
    message = f"{creator_name or 'An employee'} submitted a {report_type.upper()} report."

    for recipient in recipients:
        notification = create_notification_event(
            db,
            user_id=recipient.id,
            title=title,
            message=message,
            type="report_submitted",
            related_task_id=None,
        )

        notification_payload = {
            "type": "notification_event",
            "payload": {
                "id": str(notification.id),
                "user_id": str(notification.user_id),
                "title": notification.title,
                "message": notification.message,
                "type": notification.type,
                "related_task_id": None,
                "is_read": notification.is_read,
                "created_at": notification.created_at.isoformat(),
            },
        }

        background_tasks.add_task(
            send_notification_sync,
            str(recipient.id),
            notification_payload,
        )


def _validate_report_type(report_type: str) -> str:
    report_type = report_type.lower().strip()
    if report_type not in {"sod", "eod", "wod"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid report type")
    return report_type


def _build_report_payload(report: Any, report_type: str) -> dict[str, Any]:
    if hasattr(report, 'payload'):
        return report.payload or {}

    if report_type == 'sod':
        return {
            'report_date': report.report_date.isoformat() if getattr(report, 'report_date', None) else None,
            'sales_executive': report.sales_executive,
            'email': report.email,
            'territory_region': report.territory_region,
            'target_for_today': report.target_for_today,
            'key_meetings_planned': report.key_meetings_planned,
            'focus_industry_segment': report.focus_industry_segment,
            'support_needed': report.support_needed,
            'support_description': report.support_description,
            'remarks': report.remarks,
        }

    if report_type == 'eod':
        return {
            'report_date': report.report_date.isoformat() if getattr(report, 'report_date', None) else None,
            'sales_executive': report.sales_executive,
            'email': report.email,
            'number_of_calls': report.number_of_calls,
            'meetings_held': report.meetings_held,
            'key_clients_spoken': report.key_clients_spoken,
            'deals_moved_next_stage': report.deals_moved_next_stage,
            'challenges_faced': report.challenges_faced,
            'learnings_today': report.learnings_today,
            'remarks': report.remarks,
            'daily_score': report.daily_score,
        }

    if report_type == 'wod':
        return {
            'week_start': report.week_start.isoformat() if getattr(report, 'week_start', None) else None,
            'week_end': report.week_end.isoformat() if getattr(report, 'week_end', None) else None,
            'sales_executive': report.sales_executive,
            'email': report.email,
            'weekly_target': report.weekly_target,
            'achieved': report.achieved,
            'deals_closed': report.deals_closed,
            'hot_leads_in_pipeline': report.hot_leads_in_pipeline,
            'key_wins_this_week': report.key_wins_this_week,
            'lost_opportunities': report.lost_opportunities,
            'action_plan_next_week': report.action_plan_next_week,
            'remarks': report.remarks,
        }

    return {}


def _report_response(report: Any, report_type: str) -> dict[str, Any]:
    return {
        'id': report.id,
        'report_type': report_type,
        'payload': _build_report_payload(report, report_type),
        'created_by': str(report.created_by) if getattr(report, 'created_by', None) is not None else None,
        'created_by_name': report.created_by_name,
        'created_at': report.created_at,
        'updated_at': report.updated_at,
    }


@router.post("/sod", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_sod(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    created_by_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'name', None) or getattr(current_user, 'display_name', None) or None
    report = create_sod_report(
        db,
        payload=payload,
        creator=current_user,
        created_by_name=created_by_name,
    )
    _notify_report_submission(db, background_tasks, "sod", current_user.id, created_by_name)
    return _report_response(report, "sod")


@router.post("/eod", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_eod(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    created_by_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'name', None) or getattr(current_user, 'display_name', None) or None
    report = create_eod_report(
        db,
        payload=payload,
        creator=current_user,
        created_by_name=created_by_name,
    )
    _notify_report_submission(db, background_tasks, "eod", current_user.id, created_by_name)
    return _report_response(report, "eod")


@router.post("/wod", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_wod(
    payload: dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    created_by_name = getattr(current_user, 'full_name', None) or getattr(current_user, 'name', None) or getattr(current_user, 'display_name', None) or None
    report = create_wod_report(
        db,
        payload=payload,
        creator=current_user,
        created_by_name=created_by_name,
    )
    _notify_report_submission(db, background_tasks, "wod", current_user.id, created_by_name)
    return _report_response(report, "wod")


@router.get("/sod", response_model=List[ReportResponse])
def get_sod_reports(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # pass current_user as-is; report service will compare created_by and created_by_name
    reports = list_sod_reports_service(db, current_user=current_user, admin=(str(getattr(current_user, 'role', '')).lower() == "admin"))
    return [_report_response(r, "sod") for r in reports]


@router.get("/eod", response_model=List[ReportResponse])
def get_eod_reports(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    reports = list_eod_reports_service(db, current_user=current_user, admin=(str(getattr(current_user, 'role', '')).lower() == "admin"))
    return [_report_response(r, "eod") for r in reports]


@router.get("/wod", response_model=List[ReportResponse])
def get_wod_reports(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    reports = list_wod_reports_service(db, current_user=current_user, admin=(str(getattr(current_user, 'role', '')).lower() == "admin"))
    return [_report_response(r, "wod") for r in reports]
