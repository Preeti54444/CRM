"""
Revenue Forecast Service
Main service for calculating and managing revenue forecasts
"""
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from ..models.forecast import (
    PipelineStageConfig, BusinessVerticalConfig, ProductMaster, LenderMaster,
    RevenueRuleMaster, ForecastSnapshot, ForecastAuditTrail, ForecastResult,
    RevenueRealization, TrancheSchedule, RenewalSchedule
)
from ..models.lead import Lead
from ..models.lender_case import LenderCase
from ..models.user import User


class ForecastCalculationEngine:
    """Main engine for calculating expected revenue and weighted forecast"""

    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _normalize_uuid(value: Optional[object]) -> Optional[uuid.UUID]:
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return None
            try:
                return uuid.UUID(value)
            except (ValueError, TypeError):
                return None
        try:
            return uuid.UUID(str(value))
        except (ValueError, TypeError):
            return None

    def get_pipeline_stage_probability(self, stage_name: str) -> float:
        """Get forecast probability for a given pipeline stage"""
        if not stage_name:
            return 0.0

        normalized_stage = str(stage_name).strip().lower()
        config = self.db.query(PipelineStageConfig).filter(
            PipelineStageConfig.stage_name == stage_name,
            PipelineStageConfig.is_active == True
        ).first()

        if config:
            return config.forecast_probability if config else 0.0

        fallback_probabilities = {
            "lead created": 0.05,
            "initial discussion": 0.1,
            "financials received": 0.2,
            "lender discussion": 0.35,
            "login with lender": 0.35,
            "login to lender": 0.35,
            "bank selected": 0.35,
            "proposal submitted": 0.5,
            "proposal": 0.5,
            "credit review": 0.6,
            "documentation": 0.8,
            "sanctioned": 0.9,
            "disbursed": 1.0,
            "disbursement": 1.0,
        }

        return fallback_probabilities.get(normalized_stage, 0.2)

    def get_revenue_rule(
        self, 
        vertical_id: str, 
        product_id: str, 
        lender_id: str
    ) -> Optional[RevenueRuleMaster]:
        """Get applicable revenue rule for vertical/product/lender combination"""
        now = datetime.utcnow()
        
        rule = self.db.query(RevenueRuleMaster).filter(
            RevenueRuleMaster.business_vertical_id == vertical_id,
            RevenueRuleMaster.product_id == product_id,
            RevenueRuleMaster.lender_id == lender_id,
            RevenueRuleMaster.effective_from <= now,
            or_(
                RevenueRuleMaster.effective_to == None,
                RevenueRuleMaster.effective_to >= now
            ),
            RevenueRuleMaster.is_active == True
        ).order_by(desc(RevenueRuleMaster.effective_from)).first()
        
        return rule

    def calculate_expected_revenue(
        self,
        loan_amount: Decimal,
        rule: RevenueRuleMaster
    ) -> Dict[str, Decimal]:
        """
        Calculate expected revenue components based on revenue rule
        Returns: {
            'pf_revenue': Decimal,
            'platform_charges': Decimal,
            'processing_charges': Decimal,
            'tranche_charges': Decimal,
            'documentation_charges': Decimal,
            'advisory_fees': Decimal,
            'mandate_fees': Decimal,
            'renewal_charges': Decimal,
            'other_charges': Decimal,
            'revenue_sharing': Decimal,
            'total_expected_revenue': Decimal
        }
        """
        loan_amount = Decimal(str(loan_amount))
        
        # Calculate PF Revenue (percentage of loan amount)
        pf_revenue = loan_amount * Decimal(str(rule.pf_percentage / 100))
        
        # Convert all charges to Decimal
        platform_charges = Decimal(str(rule.platform_charges or 0))
        processing_charges = Decimal(str(rule.processing_charges or 0))
        tranche_charges = Decimal(str(rule.tranche_charges or 0))
        documentation_charges = Decimal(str(rule.documentation_charges or 0))
        advisory_fees = Decimal(str(rule.advisory_fees or 0))
        mandate_fees = Decimal(str(rule.mandate_fees or 0))
        renewal_charges = Decimal(str(rule.renewal_charges or 0))
        other_charges = Decimal(str(rule.other_commercial_charges or 0))
        
        # Revenue Sharing (percentage from PF revenue)
        revenue_sharing = pf_revenue * Decimal(str(rule.revenue_share_percentage / 100))
        
        # Total Expected Revenue formula:
        # PF Revenue + Platform Charges + Processing Charges + Tranche Charges 
        # + Documentation Charges + Advisory Fees + Mandate Fees + Renewal Charges 
        # + Other Charges - Revenue Sharing
        total_expected_revenue = (
            pf_revenue +
            platform_charges +
            processing_charges +
            tranche_charges +
            documentation_charges +
            advisory_fees +
            mandate_fees +
            renewal_charges +
            other_charges -
            revenue_sharing
        )
        
        return {
            'pf_revenue': pf_revenue,
            'platform_charges': platform_charges,
            'processing_charges': processing_charges,
            'tranche_charges': tranche_charges,
            'documentation_charges': documentation_charges,
            'advisory_fees': advisory_fees,
            'mandate_fees': mandate_fees,
            'renewal_charges': renewal_charges,
            'other_charges': other_charges,
            'revenue_sharing': revenue_sharing,
            'total_expected_revenue': total_expected_revenue
        }

    def calculate_weighted_revenue(
        self,
        expected_revenue: Decimal,
        stage_probability: float
    ) -> Decimal:
        """Calculate weighted revenue = expected revenue × stage probability"""
        return Decimal(str(expected_revenue)) * Decimal(str(stage_probability))

    def create_forecast_snapshot(
        self,
        lead_id: int,
        lead: Optional[Lead] = None,
        lender_case: Optional[LenderCase] = None,
        business_vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None,
        current_stage: Optional[str] = None,
        loan_amount: Optional[Decimal] = None,
        rm_id: Optional[str] = None,
        rm_name: Optional[str] = None
    ) -> ForecastSnapshot:
        """
        Create or update forecast snapshot for a lead/deal
        This stores the revenue calculation at the time of snapshot creation
        """
        
        # Fetch lead details if not provided
        if not lead:
            lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
        
        if not lead:
            raise ValueError(f"Lead with ID {lead_id} not found")
        
        # Default values from lead if not provided
        company_name = lead.company_name
        deal_name = lead.lead_name
        
        if not loan_amount and lender_case:
            loan_amount = lender_case.applied_loan_amount or lender_case.disbursal_amount
        
        if not current_stage:
            current_stage = lead.pipeline_stage or "New Leads"
        
        if not business_vertical_id:
            business_vertical_id = None  # Will be set from lender_case or default
        
        if not product_id:
            product_id = None  # Will be set from lender_case or default
        
        if not lender_id:
            lender_id = None  # Will be set from lender_case or default

        business_vertical_id = self._normalize_uuid(business_vertical_id)
        product_id = self._normalize_uuid(product_id)
        lender_id = self._normalize_uuid(lender_id)
        rm_id = self._normalize_uuid(rm_id)
        
        # Default RM information
        if not rm_id and lead.assigned_to:
            rm_id = self._normalize_uuid(lead.assigned_to)
            if rm_id is not None:
                rm_user = self.db.query(User).filter(User.id == lead.assigned_to).first()
                if rm_user:
                    rm_name = rm_user.full_name
        
        # Get stage probability
        stage_probability = self.get_pipeline_stage_probability(current_stage)
        
        # Initialize revenue components
        revenue_components = {}
        expected_revenue = Decimal('0')
        weighted_revenue = Decimal('0')
        revenue_rule_id = None
        
        # Calculate revenue if we have all required information
        if business_vertical_id and product_id and lender_id and loan_amount:
            rule = self.get_revenue_rule(
                str(business_vertical_id),
                str(product_id),
                str(lender_id)
            )
            
            if rule:
                revenue_rule_id = rule.id
                revenue_components = self.calculate_expected_revenue(loan_amount, rule)
                expected_revenue = revenue_components.get('total_expected_revenue', Decimal('0'))
                weighted_revenue = self.calculate_weighted_revenue(expected_revenue, stage_probability)
        
        # Check if snapshot already exists for this lead
        existing_snapshot = self.db.query(ForecastSnapshot).filter(
            ForecastSnapshot.lead_id == lead_id,
            ForecastSnapshot.is_active == True
        ).first()
        
        if existing_snapshot:
            # Update existing snapshot
            snapshot = existing_snapshot
            snapshot.updated_at = datetime.utcnow()
            snapshot.snapshot_version += 1
            snapshot.current_stage = current_stage
            snapshot.current_stage_probability = stage_probability
            snapshot.expected_revenue = expected_revenue
            snapshot.weighted_revenue = weighted_revenue
            snapshot.pf_revenue = revenue_components.get('pf_revenue', Decimal('0'))
            snapshot.platform_charges = revenue_components.get('platform_charges', Decimal('0'))
            snapshot.processing_charges = revenue_components.get('processing_charges', Decimal('0'))
            snapshot.tranche_charges = revenue_components.get('tranche_charges', Decimal('0'))
            snapshot.documentation_charges = revenue_components.get('documentation_charges', Decimal('0'))
            snapshot.advisory_fees = revenue_components.get('advisory_fees', Decimal('0'))
            snapshot.mandate_fees = revenue_components.get('mandate_fees', Decimal('0'))
            snapshot.renewal_charges = revenue_components.get('renewal_charges', Decimal('0'))
            snapshot.other_commercial_charges = revenue_components.get('other_charges', Decimal('0'))
            snapshot.revenue_sharing = revenue_components.get('revenue_sharing', Decimal('0'))
        else:
            # Create new snapshot
            snapshot = ForecastSnapshot(
                lead_id=lead_id,
                lender_case_id=lender_case.id if lender_case else None,
                deal_name=deal_name,
                company_name=company_name,
                relationship_manager_id=rm_id,
                relationship_manager_name=rm_name,
                business_vertical_id=business_vertical_id,
                product_id=product_id,
                lender_id=lender_id,
                revenue_rule_id=revenue_rule_id,
                loan_amount=loan_amount or Decimal('0'),
                current_stage=current_stage,
                current_stage_probability=stage_probability,
                expected_revenue=expected_revenue,
                weighted_revenue=weighted_revenue,
                pf_revenue=revenue_components.get('pf_revenue', Decimal('0')),
                platform_charges=revenue_components.get('platform_charges', Decimal('0')),
                processing_charges=revenue_components.get('processing_charges', Decimal('0')),
                tranche_charges=revenue_components.get('tranche_charges', Decimal('0')),
                documentation_charges=revenue_components.get('documentation_charges', Decimal('0')),
                advisory_fees=revenue_components.get('advisory_fees', Decimal('0')),
                mandate_fees=revenue_components.get('mandate_fees', Decimal('0')),
                renewal_charges=revenue_components.get('renewal_charges', Decimal('0')),
                other_commercial_charges=revenue_components.get('other_charges', Decimal('0')),
                revenue_sharing=revenue_components.get('revenue_sharing', Decimal('0')),
            )
        
        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)
        
        return snapshot

    def record_audit_trail(
        self,
        lead_id: int,
        change_type: str,
        field_name: str,
        previous_value: Optional[str],
        new_value: Optional[str],
        changed_by: Optional[str],
        changed_by_name: Optional[str],
        reason: Optional[str] = None,
        revenue_impact: Decimal = Decimal('0'),
        weighted_revenue_impact: Decimal = Decimal('0')
    ) -> ForecastAuditTrail:
        """Record an audit trail entry for a commercial change"""
        
        snapshot = self.db.query(ForecastSnapshot).filter(
            ForecastSnapshot.lead_id == lead_id,
            ForecastSnapshot.is_active == True
        ).first()
        
        audit = ForecastAuditTrail(
            lead_id=lead_id,
            forecast_snapshot_id=snapshot.id if snapshot else None,
            change_type=change_type,
            field_name=field_name,
            previous_value=previous_value,
            new_value=new_value,
            revenue_impact=revenue_impact,
            weighted_revenue_impact=weighted_revenue_impact,
            changed_by=self._normalize_uuid(changed_by),
            changed_by_name=changed_by_name,
            reason=reason,
            formula_version='1.0'
        )
        
        self.db.add(audit)
        self.db.commit()
        self.db.refresh(audit)
        
        return audit

    def get_deals_by_filters(
        self,
        vertical_id: Optional[str] = None,
        product_id: Optional[str] = None,
        lender_id: Optional[str] = None,
        stage: Optional[str] = None,
        rm_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[ForecastSnapshot], int]:
        """Get forecast snapshots with optional filters"""
        
        query = self.db.query(ForecastSnapshot).filter(
            ForecastSnapshot.is_active == True
        )
        
        if vertical_id:
            query = query.filter(ForecastSnapshot.business_vertical_id == vertical_id)
        if product_id:
            query = query.filter(ForecastSnapshot.product_id == product_id)
        if lender_id:
            query = query.filter(ForecastSnapshot.lender_id == lender_id)
        if stage:
            query = query.filter(ForecastSnapshot.current_stage == stage)
        if rm_id:
            query = query.filter(ForecastSnapshot.relationship_manager_id == rm_id)
        if status:
            query = query.filter(ForecastSnapshot.status == status)
        
        total = query.count()
        deals = query.order_by(desc(ForecastSnapshot.updated_at)).offset(skip).limit(limit).all()
        
        return deals, total

    def initialize_pipeline_stages(self):
        """Initialize default pipeline stages with probabilities"""
        stages = [
            ("Lead Created", 1, 0.05),
            ("Initial Discussion", 2, 0.10),
            ("Financials Received", 3, 0.20),
            ("Lender Discussion", 4, 0.35),
            ("Login with Lender", 5, 0.35),
            ("Proposal Submitted", 6, 0.50),
            ("Credit Review", 7, 0.60),
            ("Mandate Signed", 8, 0.75),
            ("Sanctioned", 9, 0.90),
            ("Documentation", 10, 0.95),
            ("Disbursed", 11, 1.0)
        ]
        
        for stage_name, order, probability in stages:
            existing = self.db.query(PipelineStageConfig).filter(
                PipelineStageConfig.stage_name == stage_name
            ).first()
            
            if not existing:
                config = PipelineStageConfig(
                    stage_name=stage_name,
                    stage_order=order,
                    forecast_probability=probability,
                    is_active=True
                )
                self.db.add(config)
        
        self.db.commit()

    def initialize_business_verticals(self):
        """Initialize default business verticals"""
        verticals = [
            ("Supply Chain Finance", "SCF"),
            ("Private Credit", "PC"),
            ("International Trade Finance", "ITF")
        ]
        
        for vert_name, vert_code in verticals:
            existing = self.db.query(BusinessVerticalConfig).filter(
                BusinessVerticalConfig.vertical_name == vert_name
            ).first()
            
            if not existing:
                config = BusinessVerticalConfig(
                    vertical_name=vert_name,
                    vertical_code=vert_code,
                    is_active=True
                )
                self.db.add(config)
        
        self.db.commit()

    def initialize_products(self):
        """Initialize default products"""
        products = [
            ("Vendor Finance", "VF"),
            ("Dealer Finance", "DF"),
            ("Invoice Discounting", "ID"),
            ("Working Capital", "WC"),
            ("Bridge Loans", "BL"),
            ("Export Finance", "EF"),
            ("Import Finance", "IF")
        ]
        
        for prod_name, prod_code in products:
            existing = self.db.query(ProductMaster).filter(
                ProductMaster.product_name == prod_name
            ).first()
            
            if not existing:
                config = ProductMaster(
                    product_name=prod_name,
                    product_code=prod_code,
                    is_active=True
                )
                self.db.add(config)
        
        self.db.commit()
