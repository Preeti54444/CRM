"""
Forecast Query and Aggregation Service
Handles dashboard KPI calculations and reporting
"""
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text

from ..models.forecast import (
    ForecastSnapshot, ForecastResult, RevenueRealization, TrancheSchedule,
    RenewalSchedule, PipelineStageConfig, BusinessVerticalConfig, ProductMaster,
    LenderMaster, ForecastAuditTrail
)
from ..models.lead import Lead
from ..models.loan_application import LoanApplication
from ..models.user import User

STAGE_PROBABILITIES = {
    "prospecting": 0.1,
    "qualified": 0.25,
    "proposal": 0.5,
    "credit review": 0.7,
    "sanctioned": 0.9,
    "disbursed": 1.0,
}


def _coerce_amount(value: Optional[object]) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


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


def calculate_weighted_pipeline(deals: List[Dict[str, object]]) -> float:
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


def _calculate_funding_sathi_revenue_share(deals: List[Dict[str, object]]) -> float:
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


class ForecastQueryService:
    """Service for querying and aggregating forecast data for dashboards"""

    def __init__(self, db: Session):
        self.db = db

    def get_kpi_metrics(
        self,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None,
        stage: Optional[str] = None,
        rm_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> Dict:
        """
        Calculate all KPI metrics for the forecast dashboard using the same
        lender workflow conversion logic as the main dashboard.
        """
        loan_applications = self.db.query(
            LoanApplication.lead_id,
            LoanApplication.bank_login_date,
            LoanApplication.sanction_date,
            LoanApplication.disbursal_date,
            LoanApplication.disbursal_amount,
            LoanApplication.application_status,
        ).all()

        converted_lead_ids = _collect_converted_deal_lead_ids(loan_applications)

        snapshot_query = self.db.query(ForecastSnapshot).filter(
            ForecastSnapshot.is_active == True,
            ForecastSnapshot.status == "Active"
        )

        if converted_lead_ids:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.lead_id.in_(converted_lead_ids))
        else:
            snapshot_query = snapshot_query.filter(False)

        if vertical_id:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.product_id == product_id)
        if lender_id:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.lender_id == lender_id)
        if stage:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.current_stage == stage)
        if rm_id:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.relationship_manager_id == rm_id)
        if date_from:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.created_at >= date_from)
        if date_to:
            snapshot_query = snapshot_query.filter(ForecastSnapshot.created_at <= date_to)

        snapshots = snapshot_query.all()

        total_expected_revenue = Decimal('0')
        weighted_forecast_revenue = Decimal('0')
        total_active_deals = 0
        revenue_by_stage = {}
        deals_by_stage = {}
        converted_payload = []

        for snapshot in snapshots:
            amount = Decimal(str(snapshot.expected_revenue or 0))
            total_expected_revenue += amount
            weighted_forecast_revenue += Decimal(str(snapshot.weighted_revenue or 0))
            total_active_deals += 1
            converted_payload.append({
                "value": snapshot.expected_revenue or 0,
                "stage": snapshot.current_stage,
            })

            stage = snapshot.current_stage or "Unknown"
            revenue_by_stage[stage] = revenue_by_stage.get(stage, Decimal('0')) + amount
            deals_by_stage[stage] = deals_by_stage.get(stage, 0) + 1

        realization_query = self.db.query(
            func.sum(RevenueRealization.realized_revenue_amount)
        ).filter(
            RevenueRealization.lead_id.in_([s.lead_id for s in snapshots]) if snapshots else False
        )
        revenue_realized = Decimal(str(realization_query.scalar() or 0))

        collected_query = self.db.query(
            func.sum(RevenueRealization.collected_amount)
        ).filter(
            RevenueRealization.lead_id.in_([s.lead_id for s in snapshots]) if snapshots else False,
            RevenueRealization.status == "collected"
        )
        revenue_collected = Decimal(str(collected_query.scalar() or 0))

        revenue_pending = revenue_realized - revenue_collected if revenue_realized > revenue_collected else Decimal('0')
        revenue_at_risk = sum(
            Decimal(str(snapshot.weighted_revenue or 0))
            for snapshot in snapshots
            if (snapshot.current_stage_probability or 0) < 0.5
        )

        funding_sathi_revenue_share = _calculate_funding_sathi_revenue_share(converted_payload)
        weighted_pipeline = calculate_weighted_pipeline(converted_payload)
        conversion_rate = round(
            (
                sum(1 for deal in converted_payload if normalize_pipeline_stage(deal.get("stage") or "") == "disbursed")
                / max(len(converted_payload), 1)
                * 100
            ),
            1,
        )

        forecast_accuracy = self._calculate_forecast_accuracy(snapshots)
        active_pipeline = weighted_forecast_revenue

        return {
            'total_expected_revenue': float(total_expected_revenue),
            'weighted_forecast_revenue': float(weighted_forecast_revenue),
            'revenue_realized': float(revenue_realized),
            'revenue_collected': float(revenue_collected),
            'revenue_pending': float(revenue_pending),
            'revenue_at_risk': float(revenue_at_risk),
            'forecast_accuracy_percentage': forecast_accuracy,
            'active_revenue_pipeline': float(active_pipeline),
            'total_active_deals': total_active_deals,
            'funding_sathi_revenue_share': funding_sathi_revenue_share,
            'weighted_pipeline': round(weighted_pipeline, 2),
            'expected_disbursement': round(weighted_pipeline * 0.3, 2),
            'conversion_rate': conversion_rate,
            'revenue_by_stage': {k: float(v) for k, v in revenue_by_stage.items()},
            'deals_by_stage': deals_by_stage
        }

    def _calculate_forecast_accuracy(self, snapshots: List[ForecastSnapshot]) -> float:
        """Calculate forecast accuracy by comparing forecast vs actual"""
        if not snapshots:
            return 0.0
        
        total_forecasted = Decimal('0')
        total_realized = Decimal('0')
        
        for snapshot in snapshots:
            total_forecasted += Decimal(str(snapshot.expected_revenue or 0))
            
            # Get realized revenue for this deal
            realization = self.db.query(
                func.sum(RevenueRealization.realized_revenue_amount)
            ).filter(
                RevenueRealization.lead_id == snapshot.lead_id
            ).scalar()
            
            total_realized += Decimal(str(realization or 0))
        
        if total_forecasted == 0:
            return 0.0
        
        accuracy = min(100.0, float((total_realized / total_forecasted) * 100))
        return accuracy

    def get_monthly_revenue_trend(
        self,
        months: int = 12,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Get monthly revenue trend
        Returns: [{
            'month': str,
            'expected_revenue': float,
            'weighted_revenue': float,
            'realized_revenue': float,
            'collected_revenue': float
        }]
        """
        
        trend = []
        now = datetime.utcnow()
        
        for i in range(months - 1, -1, -1):
            month_start = (now - timedelta(days=now.day) - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=31)).replace(day=1) - timedelta(days=1)
            
            # Get snapshots for this month
            snapshot_query = self.db.query(ForecastSnapshot).filter(
                ForecastSnapshot.created_at >= month_start,
                ForecastSnapshot.created_at <= month_end
            )
            
            if vertical_id:
                snapshot_query = snapshot_query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
            if product_id:
                snapshot_query = snapshot_query.filter(ForecastSnapshot.product_id == product_id)
            if lender_id:
                snapshot_query = snapshot_query.filter(ForecastSnapshot.lender_id == lender_id)
            
            snapshots = snapshot_query.all()
            
            expected_revenue = sum(Decimal(str(s.expected_revenue or 0)) for s in snapshots)
            weighted_revenue = sum(Decimal(str(s.weighted_revenue or 0)) for s in snapshots)
            
            # Get realized revenue for this month
            realized_revenue = self.db.query(
                func.sum(RevenueRealization.realized_revenue_amount)
            ).filter(
                RevenueRealization.realization_date >= month_start,
                RevenueRealization.realization_date <= month_end
            ).scalar() or Decimal('0')
            
            # Get collected revenue for this month
            collected_revenue = self.db.query(
                func.sum(RevenueRealization.collected_amount)
            ).filter(
                RevenueRealization.collection_date >= month_start,
                RevenueRealization.collection_date <= month_end,
                RevenueRealization.status == "collected"
            ).scalar() or Decimal('0')
            
            trend.append({
                'month': month_start.strftime('%Y-%m'),
                'expected_revenue': float(expected_revenue),
                'weighted_revenue': float(weighted_revenue),
                'realized_revenue': float(realized_revenue),
                'collected_revenue': float(collected_revenue)
            })
        
        return trend

    def get_revenue_by_vertical(
        self,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> List[Dict]:
        """Get revenue grouped by business vertical"""
        
        verticals = self.db.query(BusinessVerticalConfig).filter(
            BusinessVerticalConfig.is_active == True
        ).all()
        
        result = []
        
        for vertical in verticals:
            query = self.db.query(func.sum(ForecastSnapshot.expected_revenue)).filter(
                ForecastSnapshot.business_vertical_id == vertical.id,
                ForecastSnapshot.is_active == True
            )
            
            if product_id:
                query = query.filter(ForecastSnapshot.product_id == product_id)
            if lender_id:
                query = query.filter(ForecastSnapshot.lender_id == lender_id)
            
            revenue = Decimal(str(query.scalar() or 0))
            
            if revenue > 0:
                result.append({
                    'vertical_name': vertical.vertical_name,
                    'vertical_code': vertical.vertical_code,
                    'revenue': float(revenue)
                })
        
        return sorted(result, key=lambda x: x['revenue'], reverse=True)

    def get_revenue_by_product(
        self,
        vertical_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> List[Dict]:
        """Get revenue grouped by product"""
        
        products = self.db.query(ProductMaster).filter(
            ProductMaster.is_active == True
        ).all()
        
        result = []
        
        for product in products:
            query = self.db.query(func.sum(ForecastSnapshot.expected_revenue)).filter(
                ForecastSnapshot.product_id == product.id,
                ForecastSnapshot.is_active == True
            )
            
            if vertical_id:
                query = query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
            if lender_id:
                query = query.filter(ForecastSnapshot.lender_id == lender_id)
            
            revenue = Decimal(str(query.scalar() or 0))
            
            if revenue > 0:
                result.append({
                    'product_name': product.product_name,
                    'product_code': product.product_code,
                    'revenue': float(revenue)
                })
        
        return sorted(result, key=lambda x: x['revenue'], reverse=True)

    def get_revenue_by_lender(
        self,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None
    ) -> List[Dict]:
        """Get revenue grouped by lender, sorted highest to lowest"""
        
        query = self.db.query(
            LenderMaster.id,
            LenderMaster.lender_name,
            LenderMaster.lender_code,
            func.sum(ForecastSnapshot.expected_revenue).label('revenue'),
            func.count(ForecastSnapshot.id).label('deal_count')
        ).join(
            ForecastSnapshot,
            ForecastSnapshot.lender_id == LenderMaster.id
        ).filter(
            ForecastSnapshot.is_active == True,
            LenderMaster.is_active == True
        )
        
        if vertical_id:
            query = query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            query = query.filter(ForecastSnapshot.product_id == product_id)
        
        results = query.group_by(
            LenderMaster.id, LenderMaster.lender_name, LenderMaster.lender_code
        ).all()
        
        results = sorted(results, key=lambda r: float(r.revenue or 0), reverse=True)
        
        return [
            {
                'lender_name': r.lender_name,
                'lender_code': r.lender_code,
                'revenue': float(r.revenue or 0),
                'deal_count': r.deal_count or 0
            } for r in results
        ]

    def get_revenue_by_relationship_manager(
        self,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> List[Dict]:
        """Get revenue leaderboard by relationship manager"""
        
        query = self.db.query(
            ForecastSnapshot.relationship_manager_id,
            ForecastSnapshot.relationship_manager_name,
            func.sum(ForecastSnapshot.expected_revenue).label('total_revenue'),
            func.sum(ForecastSnapshot.weighted_revenue).label('weighted_revenue'),
            func.count(ForecastSnapshot.id).label('deal_count'),
            func.count(
                func.case(
                    (ForecastSnapshot.current_stage_probability == 1.0, ForecastSnapshot.id)
                )
            ).label('closed_deals')
        ).filter(
            ForecastSnapshot.is_active == True,
            ForecastSnapshot.relationship_manager_id != None
        )
        
        if vertical_id:
            query = query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            query = query.filter(ForecastSnapshot.product_id == product_id)
        if lender_id:
            query = query.filter(ForecastSnapshot.lender_id == lender_id)
        
        results = query.group_by(
            ForecastSnapshot.relationship_manager_id,
            ForecastSnapshot.relationship_manager_name
        ).all()
        
        results = sorted(results, key=lambda r: float(r.total_revenue or 0), reverse=True)
        
        leaderboard = []
        for r in results:
            conversion_pct = (r.closed_deals / r.deal_count * 100) if r.deal_count > 0 else 0
            leaderboard.append({
                'manager_id': str(r.relationship_manager_id),
                'manager_name': r.relationship_manager_name or 'Unknown',
                'total_revenue': float(r.total_revenue or 0),
                'weighted_revenue': float(r.weighted_revenue or 0),
                'deal_count': r.deal_count or 0,
                'conversion_percentage': conversion_pct
            })
        
        return leaderboard

    def get_revenue_by_sales_executive(
        self,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> List[Dict]:
        """Get revenue leaderboard by sales executive, independent of RM."""

        query = self.db.query(
            Lead.sales_executive,
            func.sum(ForecastSnapshot.expected_revenue).label('total_revenue'),
            func.sum(ForecastSnapshot.weighted_revenue).label('weighted_revenue'),
            func.count(ForecastSnapshot.id).label('deal_count'),
            func.count(
                func.case(
                    (ForecastSnapshot.current_stage_probability == 1.0, ForecastSnapshot.id)
                )
            ).label('closed_deals')
        ).join(
            Lead,
            Lead.id == ForecastSnapshot.lead_id
        ).filter(
            ForecastSnapshot.is_active == True,
            Lead.sales_executive != None,
            Lead.sales_executive != ''
        )

        if vertical_id:
            query = query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            query = query.filter(ForecastSnapshot.product_id == product_id)
        if lender_id:
            query = query.filter(ForecastSnapshot.lender_id == lender_id)

        results = query.group_by(Lead.sales_executive).all()
        results = sorted(results, key=lambda row: float(row.total_revenue or 0), reverse=True)

        return [
            {
                'sales_executive': row.sales_executive,
                'total_revenue': float(row.total_revenue or 0),
                'weighted_revenue': float(row.weighted_revenue or 0),
                'deal_count': row.deal_count or 0,
                'conversion_percentage': (row.closed_deals / row.deal_count * 100) if row.deal_count else 0,
            }
            for row in results
        ]

    def get_revenue_by_fee_type(
        self,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> Dict[str, float]:
        """Get revenue aggregated by fee type"""
        
        query = self.db.query(ForecastSnapshot).filter(
            ForecastSnapshot.is_active == True
        )
        
        if vertical_id:
            query = query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            query = query.filter(ForecastSnapshot.product_id == product_id)
        if lender_id:
            query = query.filter(ForecastSnapshot.lender_id == lender_id)
        
        snapshots = query.all()
        
        result = {
            'pf_revenue': sum(Decimal(str(s.pf_revenue or 0)) for s in snapshots),
            'platform_charges': sum(Decimal(str(s.platform_charges or 0)) for s in snapshots),
            'processing_charges': sum(Decimal(str(s.processing_charges or 0)) for s in snapshots),
            'documentation_charges': sum(Decimal(str(s.documentation_charges or 0)) for s in snapshots),
            'mandate_fees': sum(Decimal(str(s.mandate_fees or 0)) for s in snapshots),
            'advisory_fees': sum(Decimal(str(s.advisory_fees or 0)) for s in snapshots),
            'renewal_charges': sum(Decimal(str(s.renewal_charges or 0)) for s in snapshots),
            'other_charges': sum(Decimal(str(s.other_commercial_charges or 0)) for s in snapshots),
            'tranche_charges': sum(Decimal(str(s.tranche_charges or 0)) for s in snapshots),
        }
        
        return {k: float(v) for k, v in result.items()}

    def get_forecast_funnel(
        self,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> List[Dict]:
        """Get forecast funnel data showing deals and revenue by stage"""
        
        stages = self.db.query(PipelineStageConfig).filter(
            PipelineStageConfig.is_active == True
        ).order_by(PipelineStageConfig.stage_order).all()
        
        funnel = []
        
        for stage in stages:
            query = self.db.query(ForecastSnapshot).filter(
                ForecastSnapshot.current_stage == stage.stage_name,
                ForecastSnapshot.is_active == True
            )
            
            if vertical_id:
                query = query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
            if product_id:
                query = query.filter(ForecastSnapshot.product_id == product_id)
            if lender_id:
                query = query.filter(ForecastSnapshot.lender_id == lender_id)
            
            snapshots = query.all()
            
            deal_count = len(snapshots)
            total_expected_revenue = sum(Decimal(str(s.expected_revenue or 0)) for s in snapshots)
            total_weighted_revenue = sum(Decimal(str(s.weighted_revenue or 0)) for s in snapshots)
            
            avg_ticket = Decimal('0')
            if deal_count > 0:
                avg_ticket = total_expected_revenue / Decimal(str(deal_count))
            
            # Calculate conversion % (deals at this stage / total deals)
            all_deals = self.db.query(func.count(ForecastSnapshot.id)).filter(
                ForecastSnapshot.is_active == True
            ).scalar() or 1
            
            conversion_pct = (deal_count / all_deals * 100) if all_deals > 0 else 0
            
            funnel.append({
                'stage': stage.stage_name,
                'stage_order': stage.stage_order,
                'probability': stage.forecast_probability,
                'deal_count': deal_count,
                'expected_revenue': float(total_expected_revenue),
                'weighted_revenue': float(total_weighted_revenue),
                'average_ticket_size': float(avg_ticket),
                'conversion_percentage': conversion_pct
            })
        
        return funnel

    def get_upcoming_revenue(
        self,
        days_ahead: int = 90,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None
    ) -> Dict[str, List]:
        """Get upcoming revenue based on disbursement, mandate, tranche, and renewal dates"""
        
        now = datetime.utcnow()
        future_date = now + timedelta(days=days_ahead)
        
        # Upcoming disbursements
        disbursements = self.db.query(ForecastSnapshot).filter(
            ForecastSnapshot.expected_disbursement_date >= now,
            ForecastSnapshot.expected_disbursement_date <= future_date,
            ForecastSnapshot.is_active == True
        )
        
        if vertical_id:
            disbursements = disbursements.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            disbursements = disbursements.filter(ForecastSnapshot.product_id == product_id)
        if lender_id:
            disbursements = disbursements.filter(ForecastSnapshot.lender_id == lender_id)
        
        # Upcoming mandates
        mandates = self.db.query(ForecastSnapshot).filter(
            ForecastSnapshot.mandate_date >= now,
            ForecastSnapshot.mandate_date <= future_date,
            ForecastSnapshot.is_active == True
        )
        
        if vertical_id:
            mandates = mandates.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            mandates = mandates.filter(ForecastSnapshot.product_id == product_id)
        if lender_id:
            mandates = mandates.filter(ForecastSnapshot.lender_id == lender_id)
        
        # Upcoming tranches
        tranches = self.db.query(TrancheSchedule).filter(
            TrancheSchedule.expected_date >= now,
            TrancheSchedule.expected_date <= future_date,
            TrancheSchedule.status == "pending"
        ).all()
        
        # Upcoming renewals
        renewals = self.db.query(RenewalSchedule).filter(
            RenewalSchedule.renewal_expected_date >= now,
            RenewalSchedule.renewal_expected_date <= future_date,
            RenewalSchedule.status == "pending"
        ).all()
        
        lead_ids = {snapshot.lead_id for snapshot in list(disbursements) + list(mandates)}
        executive_by_lead = {
            lead.id: lead.sales_executive
            for lead in self.db.query(Lead.id, Lead.sales_executive).filter(Lead.id.in_(lead_ids)).all()
        } if lead_ids else {}

        return {
            'upcoming_disbursements': [
                {
                    'deal_name': d.deal_name,
                    'sales_executive': executive_by_lead.get(d.lead_id),
                    'expected_date': d.expected_disbursement_date.isoformat() if d.expected_disbursement_date else None,
                    'amount': float(d.weighted_revenue or 0)
                } for d in disbursements
            ],
            'upcoming_mandates': [
                {
                    'deal_name': m.deal_name,
                    'expected_date': m.mandate_date.isoformat() if m.mandate_date else None,
                    'amount': float(m.expected_revenue or 0)
                } for m in mandates
            ],
            'upcoming_tranches': [
                {
                    'tranche_number': t.tranche_number,
                    'expected_date': t.expected_date.isoformat() if t.expected_date else None,
                    'amount': float(t.tranche_amount)
                } for t in tranches
            ],
            'upcoming_renewals': [
                {
                    'renewal_number': r.renewal_number,
                    'expected_date': r.renewal_expected_date.isoformat() if r.renewal_expected_date else None,
                    'amount': float(r.renewal_amount)
                } for r in renewals
            ]
        }
