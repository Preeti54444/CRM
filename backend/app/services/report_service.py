from typing import List

from sqlalchemy.orm import Session

from ..models.report import DailyReport
from ..models.user import User


def create_daily_report(
    db: Session,
    report_type: str,
    payload: dict,
    creator: User | None = None,
    created_by_name: str | None = None,
) -> DailyReport:
    report = DailyReport(
        report_type=report_type,
        payload=payload,
        created_by=str(creator.id) if creator and getattr(creator, 'id', None) is not None else None,
        created_by_name=created_by_name or (getattr(creator, 'full_name', None) if creator else None),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_daily_reports(db: Session, report_type: str, current_user: User | None = None, admin: bool = False) -> List[DailyReport]:
    query = db.query(DailyReport).filter(DailyReport.report_type == report_type)
    if not admin and current_user is not None:
        current_name = getattr(current_user, 'full_name', None)
        query = query.filter(
            (DailyReport.created_by == str(current_user.id)) |
            (DailyReport.created_by_name == current_name)
        )
    return query.order_by(DailyReport.created_at.desc()).limit(200).all()
