from typing import List

from sqlalchemy.orm import Session

from ..models.eod_report import EODReport
from ..models.sod_report import SODReport
from ..models.wod_report import WODReport
from ..models.user import User


def create_sod_report(db: Session, payload: dict, creator: User | None = None, created_by_name: str | None = None) -> SODReport:
    report = SODReport(
        created_by=str(creator.id) if creator and getattr(creator, 'id', None) is not None else None,
        created_by_name=created_by_name,
        report_date=payload.get('report_date'),
        sales_executive=payload.get('sales_executive'),
        email=payload.get('email'),
        territory_region=payload.get('territory_region'),
        target_for_today=payload.get('target_for_today'),
        key_meetings_planned=payload.get('key_meetings_planned'),
        focus_industry_segment=payload.get('focus_industry_segment'),
        support_needed=payload.get('support_needed', 'No'),
        support_description=payload.get('support_description'),
        remarks=payload.get('remarks'),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def create_eod_report(db: Session, payload: dict, creator: User | None = None, created_by_name: str | None = None) -> EODReport:
    report = EODReport(
        created_by=str(creator.id) if creator and getattr(creator, 'id', None) is not None else None,
        created_by_name=created_by_name,
        report_date=payload.get('report_date'),
        sales_executive=payload.get('sales_executive'),
        email=payload.get('email'),
        number_of_calls=payload.get('number_of_calls', 0),
        meetings_held=payload.get('meetings_held', 0),
        key_clients_spoken=payload.get('key_clients_spoken'),
        deals_moved_next_stage=payload.get('deals_moved_next_stage'),
        challenges_faced=payload.get('challenges_faced'),
        learnings_today=payload.get('learnings_today'),
        remarks=payload.get('remarks'),
        daily_score=payload.get('daily_score', 70),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def create_wod_report(db: Session, payload: dict, creator: User | None = None, created_by_name: str | None = None) -> WODReport:
    report = WODReport(
        created_by=str(creator.id) if creator and getattr(creator, 'id', None) is not None else None,
        created_by_name=created_by_name,
        week_start=payload.get('week_start'),
        week_end=payload.get('week_end'),
        sales_executive=payload.get('sales_executive'),
        email=payload.get('email'),
        weekly_target=payload.get('weekly_target'),
        achieved=payload.get('achieved'),
        deals_closed=payload.get('deals_closed'),
        hot_leads_in_pipeline=payload.get('hot_leads_in_pipeline'),
        key_wins_this_week=payload.get('key_wins_this_week'),
        lost_opportunities=payload.get('lost_opportunities'),
        action_plan_next_week=payload.get('action_plan_next_week'),
        remarks=payload.get('remarks'),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_sod_reports(db: Session, current_user: User | None = None, admin: bool = False) -> List[SODReport]:
    query = db.query(SODReport)
    if not admin and current_user is not None:
        query = query.filter(SODReport.created_by == str(current_user.id))
    return query.order_by(SODReport.created_at.desc()).limit(200).all()


def list_eod_reports(db: Session, current_user: User | None = None, admin: bool = False) -> List[EODReport]:
    query = db.query(EODReport)
    if not admin and current_user is not None:
        query = query.filter(EODReport.created_by == str(current_user.id))
    return query.order_by(EODReport.created_at.desc()).limit(200).all()


def list_wod_reports(db: Session, current_user: User | None = None, admin: bool = False) -> List[WODReport]:
    query = db.query(WODReport)
    if not admin and current_user is not None:
        query = query.filter(WODReport.created_by == str(current_user.id))
    return query.order_by(WODReport.created_at.desc()).limit(200).all()
