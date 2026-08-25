import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin, require_admin
from ..models.activity_log import ActivityLog
from ..models.call import Call
from ..models.customer_profile import CustomerProfile
from ..models.followup import FollowUp
from ..models.lead import Lead
from ..models.loan_application import LoanApplication
from ..models.task import Task
from ..models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
api_router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)

STAGE_PROBABILITIES = {
    "prospecting": 0.1,
    "qualified": 0.25,
    "proposal": 0.5,
    "credit review": 0.7,
    "sanctioned": 0.9,
    "disbursed": 1.0,
}


def normalize_pipeline_stage(value: Optional[str]) -> str:
    if value is None:
        return ""
    normalized = str(value).strip().lower()
    aliases = {
        "new": "prospecting",
        "prospecting": "prospecting",
        "contacted": "prospecting",
        "qualified": "qualified",
        "warm": "qualified",
        "proposal": "proposal",
        "login with lender": "proposal",
        "login to lender": "proposal",
        "bank selected": "proposal",
        "proposal shared": "proposal",
        "demo": "proposal",
        "negotiation": "proposal",
        "credit review": "credit review",
        "credit-review": "credit review",
        "creditreview": "credit review",
        "processing": "credit review",
        "sanctioned": "sanctioned",
        "disbursed": "disbursed",
        "closed": "disbursed",
        "closed won": "disbursed",
        "closed-won": "disbursed",
        "won": "disbursed",
        "closed lost": "lost",
        "closed-lost": "lost",
        "lost": "lost",
        "rejected": "lost",
    }
    return aliases.get(normalized, normalized)


def calculate_weighted_pipeline(deals: List[Dict[str, Any]]) -> float:
    total = 0.0
    for deal in deals:
        if not deal:
            continue
        value = deal.get("value") or deal.get("deal_value") or deal.get("amount") or 0
        try:
            numeric_value = float(value or 0)
        except (TypeError, ValueError):
            continue
        stage = normalize_pipeline_stage(deal.get("stage") or deal.get("lead_status") or deal.get("status"))
        probability = STAGE_PROBABILITIES.get(stage, 0.1)
        total += numeric_value * probability
    return round(total, 2)


def calculate_forecast_revenue(deals: List[Dict[str, Any]]) -> float:
    return calculate_weighted_pipeline(deals)


def _coerce_amount(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _calculate_funding_sathi_revenue_share(deals: List[Dict[str, Any]]) -> float:
    default_pf_percentage = 0.02
    default_revenue_share_percentage = 0.15
    total = 0.0
    for deal in deals:
        if not deal:
            continue
        amount = _coerce_amount(deal.get("value") or deal.get("deal_value") or deal.get("amount") or 0)
        pf_revenue = amount * default_pf_percentage
        total += pf_revenue * default_revenue_share_percentage
    return round(total, 2)


def _bucket_label(raw_date: Optional[date | datetime]) -> str:
    if raw_date is None:
        return datetime.utcnow().strftime("%Y-%m")
    if isinstance(raw_date, datetime):
        return raw_date.strftime("%Y-%m")
    return raw_date.strftime("%Y-%m")


def _collect_converted_deal_lead_ids(applications: List[Any]) -> set[int]:
    converted_lead_ids: set[int] = set()
    for application in applications:
        lead_id = getattr(application, "lead_id", None) or (application.get("lead_id") if isinstance(application, dict) else None)
        if not lead_id:
            continue

        bank_login_date = getattr(application, "bank_login_date", None) or (application.get("bank_login_date") if isinstance(application, dict) else None)
        sanction_date = getattr(application, "sanction_date", None) or (application.get("sanction_date") if isinstance(application, dict) else None)
        disbursal_date = getattr(application, "disbursal_date", None) or (application.get("disbursal_date") if isinstance(application, dict) else None)
        status = getattr(application, "application_status", None) or (application.get("application_status") if isinstance(application, dict) else None)

        if bank_login_date or sanction_date or disbursal_date or str(status or "").lower() in {"sanctioned", "disbursed"}:
            converted_lead_ids.add(int(lead_id))

    return converted_lead_ids


def _build_dashboard_context(db: Session) -> Dict[str, Any]:
    # Optimize queries by selecting only needed fields
    leads = db.query(
        Lead.id,
        Lead.deal_value,
        Lead.funding_amount,
        Lead.lead_status,
        Lead.created_at,
        Lead.updated_at,
        Lead.company_name,
        Lead.assigned_to,
        Lead.pipeline_stage
    ).all()

    loan_applications = db.query(
        LoanApplication.id,
        LoanApplication.disbursal_amount,
        LoanApplication.disbursal_date,
        LoanApplication.sanction_date,
        LoanApplication.bank_login_date,
        LoanApplication.application_status,
        LoanApplication.lead_id
    ).all()

    converted_lead_ids = _collect_converted_deal_lead_ids(loan_applications)
    deals = [
        {
            "id": lead.id,
            "value": lead.deal_value or lead.funding_amount or 0,
            "stage": lead.lead_status,
            "created_at": lead.created_at,
            "updated_at": lead.updated_at,
            "company_name": lead.company_name,
            "assigned_to": lead.assigned_to,
            "pipeline_stage": lead.pipeline_stage
        }
        for lead in leads
        if lead.id in converted_lead_ids
    ]
    return {"leads": leads, "loan_applications": loan_applications, "deals": deals}


def _build_revenue_trend(context: Dict[str, Any], period: str = "month") -> List[Dict[str, Any]]:
    actual_values: Dict[str, float] = {}
    for application in context.get("loan_applications", []):
        if not application.disbursal_amount or not application.disbursal_date:
            continue
        bucket = _bucket_label(application.disbursal_date)
        actual_values[bucket] = actual_values.get(bucket, 0.0) + _coerce_amount(application.disbursal_amount)

    if period == "quarter":
        buckets = []
        start = datetime.utcnow().replace(day=1)
        for idx in range(4):
            month = (start.month - idx - 1) % 12 + 1
            year = start.year - (1 if start.month - idx <= 1 else 0)
            quarter_label = f"Q{((month - 1) // 3) + 1}-{year}"
            if quarter_label not in {item["label"] for item in buckets}:
                buckets.append({"label": quarter_label, "actual": 0.0, "forecast": 0.0})
        for bucket in buckets:
            label_year = int(bucket["label"].split("-")[-1])
            for month_key, value in actual_values.items():
                if int(month_key[:4]) != label_year:
                    continue
                quarter = ((int(month_key[5:7]) - 1) // 3) + 1
                if str(quarter) in bucket["label"]:
                    bucket["actual"] += value
                    bucket["forecast"] += value * 1.05 + 150000
        return [{"label": item["label"], "actual": round(item["actual"], 2), "forecast": round(item["forecast"], 2)} for item in buckets if item["actual"] or item["forecast"]]

    if period == "year":
        yearly: Dict[str, Dict[str, float]] = {}
        for month_key, value in actual_values.items():
            year = month_key[:4]
            yearly.setdefault(year, {"actual": 0.0, "forecast": 0.0})
            yearly[year]["actual"] += value
            yearly[year]["forecast"] += value * 1.05 + 150000
        return [{"label": year, "actual": round(values["actual"], 2), "forecast": round(values["forecast"], 2)} for year, values in sorted(yearly.items())]

    months = []
    current = datetime.utcnow().replace(day=1)
    for idx in range(6):
        month = (current - timedelta(days=30 * idx)).strftime("%Y-%m")
        months.append(month)
    months = sorted(set(months))
    return [{"label": month, "actual": round(actual_values.get(month, 0.0), 2), "forecast": round(actual_values.get(month, 0.0) * 1.05 + 150000, 2)} for month in months]


def _build_pipeline_stage_breakdown(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    # Use pipeline_stage field directly from leads if available
    leads = context.get("leads", [])
    
    # Group leads by pipeline_stage
    stage_counts = {}
    stage_values = {}
    
    for lead in leads:
        stage = lead.pipeline_stage or "New Leads"
        if stage not in stage_counts:
            stage_counts[stage] = 0
            stage_values[stage] = 0.0
        stage_counts[stage] += 1
        stage_values[stage] += _coerce_amount(lead.deal_value or lead.funding_amount or 0)
    
    # Build stage rows
    stage_rows = []
    for stage, count in stage_counts.items():
        weighted_value = calculate_weighted_pipeline([{"value": stage_values[stage], "stage": stage}])
        stage_rows.append({
            "stage": stage.lower().replace(" ", "_"),
            "label": stage,
            "count": count,
            "weighted_value": round(weighted_value, 2)
        })
    
    # Calculate percentage of total
    total_pipeline = sum(item["weighted_value"] for item in stage_rows if item["stage"] != "lost")
    for item in stage_rows:
        if item["stage"] == "lost":
            continue
        item["percentage_of_total"] = round((item["weighted_value"] / total_pipeline * 100) if total_pipeline else 0.0, 1)
    
    return sorted(stage_rows, key=lambda x: x["count"], reverse=True)


def _build_quota(context: Dict[str, Any]) -> Dict[str, Any]:
    loan_applications = context.get("loan_applications", [])
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year
    current_month_revenue = sum(_coerce_amount(application.disbursal_amount) for application in loan_applications if application.disbursal_date and application.disbursal_date.year == current_year and application.disbursal_date.month == current_month)
    recent_values = [_coerce_amount(application.disbursal_amount) for application in loan_applications if application.disbursal_date and application.disbursal_date.year == current_year]
    monthly_target = max(sum(recent_values[-3:]) / max(len(recent_values[-3:]), 1) * 1.2, current_month_revenue or 1000000)
    quarterly_target = monthly_target * 3
    annual_target = monthly_target * 12
    return {
        "monthly": {"target": round(monthly_target, 2), "current": round(current_month_revenue, 2), "achievement_percent": round((current_month_revenue / monthly_target * 100) if monthly_target else 0.0, 1)},
        "quarterly": {"target": round(quarterly_target, 2), "current": round(current_month_revenue, 2), "achievement_percent": round((current_month_revenue / quarterly_target * 100) if quarterly_target else 0.0, 1)},
        "annual": {"target": round(annual_target, 2), "current": round(current_month_revenue, 2), "achievement_percent": round((current_month_revenue / annual_target * 100) if annual_target else 0.0, 1)},
    }


def _build_forecast_accuracy(context: Dict[str, Any]) -> Dict[str, Any]:
    revenue_trend = _build_revenue_trend(context, period="month")
    if not revenue_trend:
        return {"current_month_accuracy": 92.0, "previous_month_accuracy": 89.5, "average_accuracy": 90.7}
    current_month = revenue_trend[-1] if revenue_trend else None
    previous_month = revenue_trend[-2] if len(revenue_trend) > 1 else None
    current_accuracy = 100 - (abs((current_month or {}).get("forecast", 0) - (current_month or {}).get("actual", 0)) / max((current_month or {}).get("actual", 1), 1) * 100)
    previous_accuracy = 100 - (abs((previous_month or {}).get("forecast", 0) - (previous_month or {}).get("actual", 0)) / max((previous_month or {}).get("actual", 1), 1) * 100)
    return {"current_month_accuracy": round(max(0.0, min(100.0, current_accuracy)), 1), "previous_month_accuracy": round(max(0.0, min(100.0, previous_accuracy)), 1), "average_accuracy": round((current_accuracy + previous_accuracy) / 2, 1)}


def _build_expected_closures(context: Dict[str, Any]) -> Dict[str, Any]:
    deals = context.get("deals", [])
    today = date.today()
    tomorrow = today + timedelta(days=1)
    week_end = today + timedelta(days=6)
    month_end = (today.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    counts = {"today": 0, "tomorrow": 0, "this_week": 0, "this_month": 0}
    for deal in deals:
        if not deal.get("value") or deal.get("value") in [0, None]:
            continue
        if normalize_pipeline_stage(deal.get("stage") or "") == "lost":
            continue
        created_at = deal.get("created_at")
        if created_at is None:
            continue
        expected_date = created_at.date() + timedelta(days=30)
        if expected_date == today:
            counts["today"] += 1
        elif expected_date == tomorrow:
            counts["tomorrow"] += 1
        if today <= expected_date <= week_end:
            counts["this_week"] += 1
        if today <= expected_date <= month_end:
            counts["this_month"] += 1
    return counts


def _build_high_value_deals(context: Dict[str, Any]) -> List[Dict[str, Any]]:
    active = []
    for deal in context.get("deals", []):
        stage = normalize_pipeline_stage(deal.get("stage") or "")
        if stage in {"lost", "disbursed"}:
            continue
        amount = _coerce_amount(deal.get("value") or 0)
        if amount <= 0:
            continue
        active.append({"company_name": deal.get("company_name") or "Unnamed Company", "deal_owner": "Unassigned", "stage": stage or "Prospecting", "amount": round(amount, 2)})
    active.sort(key=lambda item: item["amount"], reverse=True)
    return active[:5]


def _build_pipeline_health(context: Dict[str, Any]) -> Dict[str, Any]:
    deals = context.get("deals", [])
    total_deals = len(deals)
    lost_deals = sum(1 for deal in deals if normalize_pipeline_stage(deal.get("stage") or "") == "lost")
    active_deals = [deal for deal in deals if normalize_pipeline_stage(deal.get("stage") or "") not in {"lost", "disbursed"}]
    healthy = 0
    stuck = 0
    for deal in active_deals:
        updated_at = deal.get("updated_at")
        if updated_at and (datetime.utcnow() - updated_at).days <= 15:
            healthy += 1
        else:
            stuck += 1
    sales_cycle_days = []
    for application in context.get("loan_applications", []):
        if application.disbursal_date and application.lead and application.lead.created_at:
            sales_cycle_days.append((application.disbursal_date - application.lead.created_at.date()).days)
    average_sales_cycle = round(sum(sales_cycle_days) / len(sales_cycle_days), 1) if sales_cycle_days else 0.0
    won_deals = sum(1 for deal in deals if normalize_pipeline_stage(deal.get("stage") or "") == "disbursed")
    conversion_rate = round((won_deals / total_deals * 100) if total_deals else 0.0, 1)
    win_rate = round((won_deals / (won_deals + lost_deals) * 100) if (won_deals + lost_deals) else 0.0, 1)
    return {"healthy_leads_percentage": round((healthy / len(active_deals) * 100) if active_deals else 0.0, 1), "stuck_deals_percentage": round((stuck / len(active_deals) * 100) if active_deals else 0.0, 1), "lost_deals_percentage": round((lost_deals / total_deals * 100) if total_deals else 0.0, 1), "average_sales_cycle": average_sales_cycle, "conversion_rate": conversion_rate, "win_rate": win_rate}


def _build_ai_prediction(context: Dict[str, Any]) -> Dict[str, Any]:
    weighted_pipeline = calculate_forecast_revenue(context.get("deals", []))
    historical_revenue = sum(_coerce_amount(application.disbursal_amount) for application in context.get("loan_applications", []) if application.disbursal_amount)
    conversion_rate = 0.0
    deals = context.get("deals", [])
    if deals:
        won_deals = sum(1 for deal in deals if normalize_pipeline_stage(deal.get("stage") or "") == "disbursed")
        conversion_rate = won_deals / len(deals)
    velocity = weighted_pipeline / max(len(deals) or 1, 1)
    confidence = min(99.0, 65 + conversion_rate * 20)
    predicted_revenue = round(weighted_pipeline * 0.55 + historical_revenue * 0.25 + velocity * 0.2, 2)
    return {"predicted_next_month_revenue": round(predicted_revenue, 2), "confidence_score": round(confidence, 1)}


def _build_forecast_payload(context: Dict[str, Any], period: str = "month") -> Dict[str, Any]:
    deals = context.get("deals", [])
    weighted_pipeline = calculate_weighted_pipeline(deals)
    forecast_revenue = calculate_forecast_revenue(deals)
    expected_sanctions = round(max(0.0, float(len([deal for deal in deals if normalize_pipeline_stage(deal.get("stage") or "") in {"proposal", "credit review", "sanctioned"}])) * 0.3), 1)
    expected_disbursement = round(weighted_pipeline * 0.3, 2)
    return {"forecast_revenue": round(forecast_revenue, 2), "weighted_pipeline": round(weighted_pipeline, 2), "expected_sanctions": expected_sanctions, "expected_disbursement": expected_disbursement, "revenue_trend": _build_revenue_trend(context, period=period), "pipeline_stages": _build_pipeline_stage_breakdown(context), "quota": _build_quota(context), "forecast_accuracy": _build_forecast_accuracy(context), "expected_closures": _build_expected_closures(context), "high_value_deals": _build_high_value_deals(context), "pipeline_health": _build_pipeline_health(context), "ai_prediction": _build_ai_prediction(context)}


@router.get("/admin", response_model=Dict[str, int])
def admin_dashboard(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    total_leads = db.query(func.count(Lead.id)).scalar() or 0
    active_leads = db.query(func.count(Lead.id)).filter(Lead.lead_status != "Closed").scalar() or 0
    disbursed_leads = db.query(func.count(Lead.id)).filter(Lead.lead_status == "Disbursed").scalar() or 0
    total_followups = db.query(func.count(FollowUp.id)).scalar() or 0
    overdue_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.status == "overdue").scalar() or 0
    return {"total_leads": total_leads, "active_leads": active_leads, "disbursed_leads": disbursed_leads, "total_followups": total_followups, "overdue_followups": overdue_followups}


@router.get("/manager", response_model=Dict[str, int])
def manager_dashboard(db: Session = Depends(get_db), current_user=Depends(require_manager_or_admin)):
    team_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == current_user.id).scalar() or 0
    team_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.assigned_to == current_user.id).scalar() or 0
    return {"team_leads": team_leads, "team_followups": team_followups}


@router.get("/employee", response_model=Dict[str, int])
def employee_dashboard(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    my_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == current_user.id).scalar() or 0
    my_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.assigned_to == current_user.id).scalar() or 0
    return {"my_leads": my_leads, "my_followups": my_followups}


@router.get("/stats", response_model=Dict[str, Any])
def dashboard_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    role = (current_user.role or "").lower()

    loan_applications = db.query(
        LoanApplication.id,
        LoanApplication.lead_id,
        LoanApplication.bank_login_date,
        LoanApplication.sanction_date,
        LoanApplication.disbursal_date,
        LoanApplication.disbursal_amount,
        LoanApplication.application_status,
    ).all()

    lead_rows = db.query(
        Lead.id,
        Lead.deal_value,
        Lead.funding_amount,
        Lead.lead_status,
        Lead.pipeline_stage,
    ).all()

    converted_lead_ids: set[int] = set()
    for lead in lead_rows:
        stage_text = f"{lead.lead_status or ''} {lead.pipeline_stage or ''}".lower()
        if any(token in stage_text for token in ["login", "bank", "sanction", "disburse", "proposal", "credit", "documentation"]) and (lead.deal_value or lead.funding_amount):
            converted_lead_ids.add(lead.id)

    converted_lead_ids.update(_collect_converted_deal_lead_ids(loan_applications))

    total_logins = sum(
        1
        for lead in lead_rows
        if lead.id in converted_lead_ids and (
            any(token in f"{lead.lead_status or ''} {lead.pipeline_stage or ''}".lower() for token in ["login", "bank"])
            or any(application.bank_login_date for application in loan_applications if application.lead_id == lead.id)
        )
    )
    total_sanctions = sum(
        1
        for lead in lead_rows
        if lead.id in converted_lead_ids and (
            any(token in f"{lead.lead_status or ''} {lead.pipeline_stage or ''}".lower() for token in ["sanction"])
            or any(
                application.sanction_date or str(application.application_status or "").lower() == "sanctioned"
                for application in loan_applications if application.lead_id == lead.id
            )
        )
    )
    total_disbursement = sum(
        _coerce_amount(application.disbursal_amount)
        for application in loan_applications
        if application.lead_id in converted_lead_ids and application.disbursal_date
    )

    converted_deals = [
        {
            "id": lead.id,
            "value": lead.deal_value or lead.funding_amount or 0,
            "stage": lead.lead_status,
            "pipeline_stage": lead.pipeline_stage,
        }
        for lead in lead_rows
        if lead.id in converted_lead_ids
    ]

    converted_deal_payload = [
        {
            "id": lead.id,
            "value": lead.deal_value or lead.funding_amount or 0,
            "stage": lead.lead_status,
            "pipeline_stage": lead.pipeline_stage,
        }
        for lead in lead_rows
        if lead.id in converted_lead_ids
    ]

    converted_deal_payload = converted_deals
    weighted_pipeline = calculate_weighted_pipeline(converted_deal_payload)
    funding_sathi_revenue_share = _calculate_funding_sathi_revenue_share(converted_deal_payload)
    conversion_rate = round((sum(1 for deal in converted_deal_payload if normalize_pipeline_stage(deal.get("stage") or "") == "disbursed") / max(len(converted_deal_payload), 1) * 100), 1)

    if role in ["admin", "manager"]:
        total_leads = db.query(func.count(Lead.id)).scalar() or 0
        active_leads = db.query(func.count(Lead.id)).filter(Lead.lead_status != "Closed").scalar() or 0
        total_deals = len(converted_lead_ids)
        total_revenue = int(total_disbursement)

        total_followups = db.query(func.count(FollowUp.id)).scalar() or 0
        total_clients = db.query(func.count(CustomerProfile.id)).scalar() or 0
        total_calls = db.query(func.count(Call.id)).scalar() or 0

        return {
            "total_leads": total_leads,
            "active_leads": active_leads,
            "total_followups": total_followups,
            "total_clients": total_clients,
            "total_calls": total_calls,
            "total_deals": total_deals,
            "total_revenue": total_revenue,
            "total_logins": total_logins,
            "total_sanctions": total_sanctions,
            "total_disbursement": float(total_disbursement),
            "funding_sathi_revenue_share": funding_sathi_revenue_share,
            "weighted_pipeline": round(weighted_pipeline, 2),
            "expected_disbursement": round(weighted_pipeline * 0.3, 2),
            "conversion_rate": conversion_rate,
        }

    # Employee-specific optimized query
    my_leads = db.query(func.count(Lead.id)).filter(Lead.assigned_to == current_user.id).scalar() or 0
    my_followups = db.query(func.count(FollowUp.id)).filter(FollowUp.assigned_to == current_user.id).scalar() or 0
    my_open_tasks = db.query(func.count(Task.id)).filter(Task.assigned_to == current_user.id, Task.status != "Completed").scalar() or 0
    return {
        "total_leads": my_leads,
        "active_leads": my_leads,
        "total_followups": my_followups,
        "open_tasks": my_open_tasks,
        "total_logins": total_logins,
        "total_sanctions": total_sanctions,
        "total_disbursement": float(total_disbursement),
        "funding_sathi_revenue_share": funding_sathi_revenue_share,
        "weighted_pipeline": round(weighted_pipeline, 2),
        "expected_disbursement": round(weighted_pipeline * 0.3, 2),
        "conversion_rate": conversion_rate,
    }


@api_router.get("/stats", response_model=Dict[str, Any])
def api_dashboard_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return dashboard_stats(db=db, current_user=current_user)


@router.get("/forecast")
def forecast_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), period: str = "month"):
    try:
        context = _build_dashboard_context(db)
        return _build_forecast_payload(context, period=period)
    except Exception as exc:
        logger.exception("Forecast dashboard generation failed")
        return {"detail": "Forecast dashboard unavailable", "error": str(exc)}


@api_router.get("/forecast")
def api_forecast_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), period: str = "month"):
    return forecast_dashboard(db=db, current_user=current_user, period=period)


@router.get("/weighted-pipeline")
def weighted_pipeline_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        return {"weighted_pipeline": calculate_weighted_pipeline(context.get("deals", []))}
    except Exception as exc:
        logger.exception("Weighted pipeline calculation failed")
        return {"weighted_pipeline": 0.0, "error": str(exc)}


@api_router.get("/weighted-pipeline")
def api_weighted_pipeline_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return weighted_pipeline_dashboard(db=db, current_user=current_user)


@router.get("/expected-sanctions")
def expected_sanctions_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        deals = context.get("deals", [])
        expected_sanctions = round(max(0.0, float(len([deal for deal in deals if normalize_pipeline_stage(deal.get("stage") or "") in {"proposal", "credit review", "sanctioned"}])) * 0.3), 1)
        return {"expected_sanctions": expected_sanctions, "today_increase": round(expected_sanctions * 0.08, 1)}
    except Exception as exc:
        logger.exception("Expected sanctions calculation failed")
        return {"expected_sanctions": 0.0, "today_increase": 0.0, "error": str(exc)}


@api_router.get("/expected-sanctions")
def api_expected_sanctions_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return expected_sanctions_dashboard(db=db, current_user=current_user)


@router.get("/expected-disbursement")
def expected_disbursement_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        weighted_pipeline = calculate_weighted_pipeline(context.get("deals", []))
        expected_disbursement = round(weighted_pipeline * 0.3, 2)
        return {"expected_disbursement": expected_disbursement, "today_expected_increase": round(expected_disbursement * 0.05, 2)}
    except Exception as exc:
        logger.exception("Expected disbursement calculation failed")
        return {"expected_disbursement": 0.0, "today_expected_increase": 0.0, "error": str(exc)}


@api_router.get("/expected-disbursement")
def api_expected_disbursement_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return expected_disbursement_dashboard(db=db, current_user=current_user)


@router.get("/revenue-trend")
def revenue_trend_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), period: str = "month"):
    try:
        context = _build_dashboard_context(db)
        return {"revenue_trend": _build_revenue_trend(context, period=period)}
    except Exception as exc:
        logger.exception("Revenue trend calculation failed")
        return {"revenue_trend": [], "error": str(exc)}


@api_router.get("/revenue-trend")
def api_revenue_trend_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), period: str = "month"):
    return revenue_trend_dashboard(db=db, current_user=current_user, period=period)


@router.get("/pipeline-stage")
def pipeline_stage_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        return {"pipeline_stages": _build_pipeline_stage_breakdown(context)}
    except Exception as exc:
        logger.exception("Pipeline stage breakdown calculation failed")
        return {"pipeline_stages": [], "error": str(exc)}


@api_router.get("/pipeline-stage")
def api_pipeline_stage_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return pipeline_stage_dashboard(db=db, current_user=current_user)


@router.get("/quota")
def quota_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        return {"quota": _build_quota(context)}
    except Exception as exc:
        logger.exception("Quota calculation failed")
        return {"quota": {}, "error": str(exc)}


@api_router.get("/quota")
def api_quota_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return quota_dashboard(db=db, current_user=current_user)


@router.get("/forecast-accuracy")
def forecast_accuracy_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        return {"forecast_accuracy": _build_forecast_accuracy(context)}
    except Exception as exc:
        logger.exception("Forecast accuracy calculation failed")
        return {"forecast_accuracy": {}, "error": str(exc)}


@api_router.get("/forecast-accuracy")
def api_forecast_accuracy_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return forecast_accuracy_dashboard(db=db, current_user=current_user)


@router.get("/expected-closures")
def expected_closures_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        return {"expected_closures": _build_expected_closures(context)}
    except Exception as exc:
        logger.exception("Expected closures calculation failed")
        return {"expected_closures": {}, "error": str(exc)}


@api_router.get("/expected-closures")
def api_expected_closures_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return expected_closures_dashboard(db=db, current_user=current_user)


@router.get("/high-value-deals")
def high_value_deals_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        return {"high_value_deals": _build_high_value_deals(context)}
    except Exception as exc:
        logger.exception("High value deals calculation failed")
        return {"high_value_deals": [], "error": str(exc)}


@api_router.get("/high-value-deals")
def api_high_value_deals_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return high_value_deals_dashboard(db=db, current_user=current_user)


@router.get("/pipeline-health")
def pipeline_health_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        context = _build_dashboard_context(db)
        return {"pipeline_health": _build_pipeline_health(context)}
    except Exception as exc:
        logger.exception("Pipeline health calculation failed")
        return {"pipeline_health": {}, "error": str(exc)}


@api_router.get("/pipeline-health")
def api_pipeline_health_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return pipeline_health_dashboard(db=db, current_user=current_user)
