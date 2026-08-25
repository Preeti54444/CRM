"""
Forecast Module Models for Revenue Intelligence Dashboard
Includes all models needed for forecast calculations, revenue snapshots, and audit trails
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, 
    Boolean, Numeric, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base


class PipelineStageConfig(Base):
    """Pipeline stage configuration with forecast probability"""
    __tablename__ = "pipeline_stage_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    stage_name = Column(String(100), nullable=False, unique=True, index=True)
    stage_order = Column(Integer, nullable=False)
    forecast_probability = Column(Float, nullable=False)  # 0.05 to 1.0 (5% to 100%)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_stage_order', 'stage_order'),
    )


class BusinessVerticalConfig(Base):
    """Business Vertical Master Configuration"""
    __tablename__ = "business_vertical_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    vertical_name = Column(String(100), nullable=False, unique=True, index=True)
    vertical_code = Column(String(20), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    revenue_formula_version = Column(String(20), default="1.0")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ProductMaster(Base):
    """Product Master Configuration"""
    __tablename__ = "product_masters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    product_name = Column(String(100), nullable=False, unique=True, index=True)
    product_code = Column(String(20), nullable=False, unique=True)
    business_vertical_id = Column(UUID(as_uuid=True), ForeignKey("business_vertical_configs.id"), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LenderMaster(Base):
    """Lender Master Configuration"""
    __tablename__ = "lender_masters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lender_name = Column(String(100), nullable=False, unique=True, index=True)
    lender_code = Column(String(20), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RevenueRuleMaster(Base):
    """Revenue Rule Master for calculating Expected Revenue"""
    __tablename__ = "revenue_rule_masters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    business_vertical_id = Column(UUID(as_uuid=True), ForeignKey("business_vertical_configs.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("product_masters.id"), nullable=False)
    lender_id = Column(UUID(as_uuid=True), ForeignKey("lender_masters.id"), nullable=False)
    
    # Revenue Components (as percentages or fixed amounts)
    pf_percentage = Column(Float, default=0.0)  # PF % of loan amount
    platform_charges = Column(Numeric, default=0.0)  # Fixed or percentage
    processing_charges = Column(Numeric, default=0.0)
    tranche_charges = Column(Numeric, default=0.0)
    documentation_charges = Column(Numeric, default=0.0)
    advisory_fees = Column(Numeric, default=0.0)
    mandate_fees = Column(Numeric, default=0.0)
    renewal_charges = Column(Numeric, default=0.0)
    other_commercial_charges = Column(Numeric, default=0.0)
    revenue_share_percentage = Column(Float, default=0.0)  # Revenue sharing %
    
    effective_from = Column(DateTime, nullable=False)
    effective_to = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    
    created_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_vertical_product_lender', 'business_vertical_id', 'product_id', 'lender_id'),
        Index('idx_effective_dates', 'effective_from', 'effective_to'),
    )


class ForecastSnapshot(Base):
    """Store revenue snapshot when deal is created/updated"""
    __tablename__ = "forecast_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, nullable=False, index=True)  # Link to Lead/Deal
    lender_case_id = Column(Integer, nullable=True, index=True)  # Link to LenderCase if exists
    
    # Deal Information
    deal_name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    relationship_manager_id = Column(UUID(as_uuid=True), nullable=True)
    relationship_manager_name = Column(String(255), nullable=True)
    
    # Business Configuration
    business_vertical_id = Column(UUID(as_uuid=True), ForeignKey("business_vertical_configs.id"), nullable=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("product_masters.id"), nullable=True)
    lender_id = Column(UUID(as_uuid=True), ForeignKey("lender_masters.id"), nullable=True)
    revenue_rule_id = Column(UUID(as_uuid=True), ForeignKey("revenue_rule_masters.id"), nullable=True)
    
    # Deal Amount
    loan_amount = Column(Numeric, nullable=False)
    
    # Revenue Components (calculated based on revenue rule at snapshot time)
    pf_revenue = Column(Numeric, default=0.0)
    platform_charges = Column(Numeric, default=0.0)
    processing_charges = Column(Numeric, default=0.0)
    tranche_charges = Column(Numeric, default=0.0)
    documentation_charges = Column(Numeric, default=0.0)
    advisory_fees = Column(Numeric, default=0.0)
    mandate_fees = Column(Numeric, default=0.0)
    renewal_charges = Column(Numeric, default=0.0)
    other_commercial_charges = Column(Numeric, default=0.0)
    revenue_sharing = Column(Numeric, default=0.0)
    
    # Calculated Revenues
    expected_revenue = Column(Numeric, default=0.0)  # Total expected revenue
    weighted_revenue = Column(Numeric, default=0.0)  # Expected revenue × probability
    
    # Pipeline Information
    current_stage = Column(String(100), nullable=True)
    current_stage_probability = Column(Float, default=0.0)
    
    # Dates
    mandate_date = Column(DateTime, nullable=True)
    first_tranche_date = Column(DateTime, nullable=True)
    expected_disbursement_date = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    status = Column(String(50), default="Active")  # Active, Closed, Cancelled
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    snapshot_version = Column(Integer, default=1)  # Track snapshot versions

    __table_args__ = (
        Index('idx_lead_id_active', 'lead_id', 'is_active'),
        Index('idx_stage_probability', 'current_stage', 'current_stage_probability'),
    )


class ForecastAuditTrail(Base):
    """Audit trail for all commercial changes"""
    __tablename__ = "forecast_audit_trails"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, nullable=False, index=True)
    forecast_snapshot_id = Column(UUID(as_uuid=True), ForeignKey("forecast_snapshots.id"), nullable=True)
    
    # Change Information
    change_type = Column(String(50), nullable=False)  # revenue_override, stage_change, etc.
    field_name = Column(String(100), nullable=False)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    
    # Impact
    revenue_impact = Column(Numeric, default=0.0)
    weighted_revenue_impact = Column(Numeric, default=0.0)
    
    # User Information
    changed_by = Column(UUID(as_uuid=True), nullable=True)
    changed_by_name = Column(String(255), nullable=True)
    approved_by = Column(UUID(as_uuid=True), nullable=True)
    approval_status = Column(String(20), default="pending")  # pending, approved, rejected
    
    # Context
    reason = Column(Text, nullable=True)
    formula_version = Column(String(20), nullable=True)
    audit_metadata = Column("metadata", JSON, nullable=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    approval_date = Column(DateTime, nullable=True)

    __table_args__ = (
        Index('idx_lead_change_type', 'lead_id', 'change_type'),
        Index('idx_created_at', 'created_at'),
    )


class ForecastResult(Base):
    """Aggregated forecast results for dashboard"""
    __tablename__ = "forecast_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    
    # Result Period
    calculation_date = Column(DateTime, default=datetime.utcnow)
    period = Column(String(20), nullable=False)  # monthly, quarterly, annual
    
    # Key Metrics
    total_expected_revenue = Column(Numeric, default=0.0)
    total_weighted_revenue = Column(Numeric, default=0.0)
    revenue_realized = Column(Numeric, default=0.0)
    revenue_collected = Column(Numeric, default=0.0)
    revenue_pending = Column(Numeric, default=0.0)
    revenue_at_risk = Column(Numeric, default=0.0)
    
    # Accuracy
    forecast_accuracy_percentage = Column(Float, default=0.0)
    active_revenue_pipeline = Column(Numeric, default=0.0)
    
    # Deal Counts
    total_active_deals = Column(Integer, default=0)
    deals_by_stage = Column(JSON, nullable=True)  # {stage: count}
    revenue_by_stage = Column(JSON, nullable=True)  # {stage: revenue}
    
    # Filters Applied
    filters_applied = Column(JSON, nullable=True)  # {vertical, product, lender, etc.}
    
    # Status
    is_latest = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_calculation_date_latest', 'calculation_date', 'is_latest'),
    )


class RevenueRealization(Base):
    """Track actual revenue realization against forecast"""
    __tablename__ = "revenue_realizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, nullable=False, index=True)
    forecast_snapshot_id = Column(UUID(as_uuid=True), ForeignKey("forecast_snapshots.id"), nullable=True)
    
    # Realization Details
    realization_date = Column(DateTime, nullable=False)
    realized_revenue_amount = Column(Numeric, nullable=False)
    collected_amount = Column(Numeric, nullable=True)
    collection_date = Column(DateTime, nullable=True)
    
    # Components Realized
    pf_revenue_realized = Column(Numeric, default=0.0)
    platform_charges_realized = Column(Numeric, default=0.0)
    processing_charges_realized = Column(Numeric, default=0.0)
    tranche_charges_realized = Column(Numeric, default=0.0)
    documentation_charges_realized = Column(Numeric, default=0.0)
    advisory_fees_realized = Column(Numeric, default=0.0)
    mandate_fees_realized = Column(Numeric, default=0.0)
    renewal_charges_realized = Column(Numeric, default=0.0)
    other_charges_realized = Column(Numeric, default=0.0)
    
    # Comparison
    forecasted_revenue = Column(Numeric, nullable=True)
    variance = Column(Numeric, nullable=True)
    variance_percentage = Column(Float, nullable=True)
    
    # Status
    status = Column(String(50), default="realized")  # realized, collected, pending
    notes = Column(Text, nullable=True)
    
    # Audit
    recorded_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_lead_realization_date', 'lead_id', 'realization_date'),
    )


class TrancheSchedule(Base):
    """Tranche schedule for forecasting future revenue"""
    __tablename__ = "tranche_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, nullable=False, index=True)
    forecast_snapshot_id = Column(UUID(as_uuid=True), ForeignKey("forecast_snapshots.id"), nullable=True)
    
    # Tranche Details
    tranche_number = Column(Integer, nullable=False)
    tranche_amount = Column(Numeric, nullable=False)
    expected_date = Column(DateTime, nullable=False)
    actual_date = Column(DateTime, nullable=True)
    
    # Charges for this Tranche
    tranche_charges = Column(Numeric, default=0.0)
    documentation_charges = Column(Numeric, default=0.0)
    other_charges = Column(Numeric, default=0.0)
    
    # Status
    status = Column(String(50), default="pending")  # pending, expected, realized
    notes = Column(Text, nullable=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_lead_tranche_date', 'lead_id', 'expected_date'),
    )


class RenewalSchedule(Base):
    """Renewal schedule for forecasting renewal revenue"""
    __tablename__ = "renewal_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    lead_id = Column(Integer, nullable=False, index=True)
    forecast_snapshot_id = Column(UUID(as_uuid=True), ForeignKey("forecast_snapshots.id"), nullable=True)
    
    # Renewal Details
    renewal_number = Column(Integer, nullable=False)
    original_mandate_date = Column(DateTime, nullable=True)
    renewal_expected_date = Column(DateTime, nullable=False)
    renewal_actual_date = Column(DateTime, nullable=True)
    
    # Renewal Revenue
    renewal_charges = Column(Numeric, default=0.0)
    renewal_amount = Column(Numeric, nullable=False)
    
    # Status
    status = Column(String(50), default="pending")  # pending, expected, realized, cancelled
    renewal_sanctioned = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    
    # Audit
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_lead_renewal_date', 'lead_id', 'renewal_expected_date'),
    )
