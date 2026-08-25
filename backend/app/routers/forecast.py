"""
Forecast API Endpoints
Complete REST API for Revenue Forecast Module
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any

from ..database import SessionLocal
from ..services.forecast_service import ForecastCalculationEngine
from ..services.forecast_query_service import ForecastQueryService
from ..models.forecast import ForecastSnapshot, ForecastAuditTrail
from ..models.lead import Lead
from ..models.lender_case import LenderCase
from ..models.user import User
from ..auth.dependencies import get_current_user

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/initialize")
async def initialize_forecast_data(db: Session = Depends(get_db)):
    """Initialize default forecast configurations"""
    try:
        engine = ForecastCalculationEngine(db)
        engine.initialize_pipeline_stages()
        engine.initialize_business_verticals()
        engine.initialize_products()
        
        return {
            "status": "success",
            "message": "Forecast data initialized successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/snapshot/create")
async def create_snapshot(
    lead_id: int,
    business_vertical_id: Optional[str] = None,
    product_id: Optional[str] = None,
    lender_id: Optional[str] = None,
    current_stage: Optional[str] = None,
    loan_amount: Optional[float] = None,
    rm_id: Optional[str] = None,
    rm_name: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update forecast snapshot for a lead"""
    try:
        engine = ForecastCalculationEngine(db)
        
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        snapshot = engine.create_forecast_snapshot(
            lead_id=lead_id,
            lead=lead,
            business_vertical_id=business_vertical_id,
            product_id=product_id,
            lender_id=lender_id,
            current_stage=current_stage,
            loan_amount=loan_amount,
            rm_id=rm_id,
            rm_name=rm_name
        )
        
        return {
            "status": "success",
            "snapshot_id": str(snapshot.id),
            "expected_revenue": float(snapshot.expected_revenue),
            "weighted_revenue": float(snapshot.weighted_revenue),
            "current_stage": snapshot.current_stage,
            "stage_probability": snapshot.current_stage_probability
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/kpis")
async def get_kpi_metrics(
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    rm_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all KPI metrics for forecast dashboard"""
    try:
        date_from_dt = datetime.fromisoformat(date_from) if date_from else None
        date_to_dt = datetime.fromisoformat(date_to) if date_to else None
        
        query_service = ForecastQueryService(db)
        kpis = query_service.get_kpi_metrics(
            vertical_id=vertical_id,
            product_id=product_id,
            lender_id=lender_id,
            stage=stage,
            rm_id=rm_id,
            date_from=date_from_dt,
            date_to=date_to_dt
        )
        
        return {
            "status": "success",
            "data": kpis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/revenue-trend")
async def get_revenue_trend(
    months: int = Query(12, le=36),
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get monthly revenue trend"""
    try:
        query_service = ForecastQueryService(db)
        trend = query_service.get_monthly_revenue_trend(
            months=months,
            vertical_id=vertical_id,
            product_id=product_id,
            lender_id=lender_id
        )
        
        return {
            "status": "success",
            "data": trend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-vertical")
async def get_revenue_by_vertical(
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get revenue by business vertical"""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_revenue_by_vertical(product_id, lender_id)
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-product")
async def get_revenue_by_product(
    vertical_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get revenue by product"""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_revenue_by_product(vertical_id, lender_id)
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-lender")
async def get_revenue_by_lender(
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get revenue by lender, sorted highest to lowest"""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_revenue_by_lender(vertical_id, product_id)
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-relationship-manager")
async def get_revenue_by_rm(
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get revenue leaderboard by relationship manager"""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_revenue_by_relationship_manager(
            vertical_id, product_id, lender_id
        )
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-sales-executive")
async def get_revenue_by_sales_executive(
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get revenue leaderboard by sales executive, separate from RM."""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_revenue_by_sales_executive(
            vertical_id, product_id, lender_id
        )

        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/by-fee-type")
async def get_revenue_by_fee_type(
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get revenue aggregated by fee type"""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_revenue_by_fee_type(vertical_id, product_id, lender_id)
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel")
async def get_forecast_funnel(
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get forecast funnel by pipeline stage"""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_forecast_funnel(vertical_id, product_id, lender_id)
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/upcoming-revenue")
async def get_upcoming_revenue(
    days_ahead: int = Query(90, le=365),
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming revenue by disbursement, mandate, tranche, and renewal dates"""
    try:
        query_service = ForecastQueryService(db)
        result = query_service.get_upcoming_revenue(
            days_ahead, vertical_id, product_id, lender_id
        )
        
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deals")
async def get_deals_with_filters(
    vertical_id: Optional[str] = Query(None),
    product_id: Optional[str] = Query(None),
    lender_id: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    rm_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get deals with drill-down filtering"""
    try:
        engine = ForecastCalculationEngine(db)
        deals, total = engine.get_deals_by_filters(
            vertical_id=vertical_id,
            product_id=product_id,
            lender_id=lender_id,
            stage=stage,
            rm_id=rm_id,
            status=status,
            skip=skip,
            limit=limit
        )
        
        deal_list = [
            {
                "id": str(d.id),
                "lead_id": d.lead_id,
                "deal_name": d.deal_name,
                "company_name": d.company_name,
                "rm_name": d.relationship_manager_name,
                "sales_executive": db.query(Lead.sales_executive).filter(Lead.id == d.lead_id).scalar(),
                "vertical": d.business_vertical_id,
                "product": d.product_id,
                "lender": d.lender_id,
                "expected_revenue": float(d.expected_revenue or 0),
                "weighted_revenue": float(d.weighted_revenue or 0),
                "current_stage": d.current_stage,
                "probability": d.current_stage_probability,
                "status": d.status,
                "disbursement_date": d.expected_disbursement_date.isoformat() if d.expected_disbursement_date else None,
                "loan_amount": float(d.loan_amount or 0)
            } for d in deals
        ]
        
        return {
            "status": "success",
            "data": deal_list,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/deal/{lead_id}/commercial-revenue")
async def save_commercial_revenue_details(
    lead_id: int,
    payload: Dict[str, Any],
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save the commercial revenue inputs for a deal and refresh the forecast snapshot automatically."""
    try:
        engine = ForecastCalculationEngine(db)
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        snapshot = db.query(ForecastSnapshot).filter(
            ForecastSnapshot.lead_id == lead_id,
            ForecastSnapshot.is_active == True
        ).first()

        if not snapshot:
            snapshot = engine.create_forecast_snapshot(
                lead_id=lead_id,
                lead=lead,
                current_stage=lead.pipeline_stage or lead.lead_status or 'New Leads',
                loan_amount=Decimal(str(payload.get('loan_amount') or lead.deal_value or lead.funding_amount or 0)),
                rm_id=str(lead.assigned_to) if lead.assigned_to else None,
                rm_name=None,
            )

        loan_amount = Decimal(str(payload.get('loan_amount') or snapshot.loan_amount or lead.deal_value or lead.funding_amount or 0))
        pf_percentage = Decimal(str(payload.get('pf_percentage') or 0))
        revenue_share_percentage = Decimal(str(payload.get('revenue_share_percentage') or 0))
        platform_charges = Decimal(str(payload.get('platform_charges') or 0))
        tranche_charges = Decimal(str(payload.get('tranche_charges') or 0))
        advisory_fees = Decimal(str(payload.get('advisory_fees') or 0))
        mandate_fees = Decimal(str(payload.get('mandate_fees') or 0))
        renewal_charges = Decimal(str(payload.get('renewal_charges') or 0))
        other_charges = Decimal(str(payload.get('other_charges') or payload.get('other_commercial_charges') or 0))
        stage_name = snapshot.current_stage or lead.pipeline_stage or lead.lead_status or 'New Leads'
        stage_probability = engine.get_pipeline_stage_probability(stage_name)

        pf_revenue = loan_amount * (pf_percentage / Decimal('100'))
        revenue_sharing = pf_revenue * (revenue_share_percentage / Decimal('100'))
        expected_revenue = (
            pf_revenue +
            platform_charges +
            tranche_charges +
            advisory_fees +
            mandate_fees +
            renewal_charges +
            other_charges -
            revenue_sharing
        )
        weighted_revenue = expected_revenue * Decimal(str(stage_probability))

        previous_expected = Decimal(str(snapshot.expected_revenue or 0))
        previous_weighted = Decimal(str(snapshot.weighted_revenue or 0))

        snapshot.loan_amount = loan_amount
        snapshot.current_stage = stage_name
        snapshot.current_stage_probability = stage_probability
        snapshot.pf_revenue = pf_revenue
        snapshot.platform_charges = platform_charges
        snapshot.tranche_charges = tranche_charges
        snapshot.advisory_fees = advisory_fees
        snapshot.mandate_fees = mandate_fees
        snapshot.renewal_charges = renewal_charges
        snapshot.other_commercial_charges = other_charges
        snapshot.revenue_sharing = revenue_sharing
        snapshot.expected_revenue = expected_revenue
        snapshot.weighted_revenue = weighted_revenue
        snapshot.updated_at = datetime.utcnow()
        snapshot.snapshot_version = (snapshot.snapshot_version or 1) + 1

        db.add(snapshot)
        db.flush()

        engine.record_audit_trail(
            lead_id=lead_id,
            change_type='commercial_revenue_update',
            field_name='commercial_revenue',
            previous_value=str(previous_expected),
            new_value=str(expected_revenue),
            changed_by=str(getattr(current_user, 'id', None) or ''),
            changed_by_name=getattr(current_user, 'full_name', None) or getattr(current_user, 'name', None) or 'System',
            reason=payload.get('override_reason') or payload.get('remarks') or 'Commercial revenue captured automatically',
            revenue_impact=abs(expected_revenue - previous_expected),
            weighted_revenue_impact=abs(weighted_revenue - previous_weighted),
        )

        db.commit()
        db.refresh(snapshot)

        return {
            "status": "success",
            "message": "Commercial revenue details saved and forecast refreshed",
            "data": {
                "lead_id": snapshot.lead_id,
                "loan_amount": float(snapshot.loan_amount or 0),
                "pf_revenue": float(snapshot.pf_revenue or 0),
                "platform_charges": float(snapshot.platform_charges or 0),
                "tranche_charges": float(snapshot.tranche_charges or 0),
                "advisory_fees": float(snapshot.advisory_fees or 0),
                "mandate_fees": float(snapshot.mandate_fees or 0),
                "renewal_charges": float(snapshot.renewal_charges or 0),
                "other_charges": float(snapshot.other_commercial_charges or 0),
                "revenue_sharing": float(snapshot.revenue_sharing or 0),
                "expected_revenue": float(snapshot.expected_revenue or 0),
                "weighted_revenue": float(snapshot.weighted_revenue or 0),
                "stage_probability": float(snapshot.current_stage_probability or 0),
                "updated_at": snapshot.updated_at.isoformat(),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deal/{lead_id}")
async def get_deal_details(
    lead_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed forecast information for a specific deal"""
    try:
        snapshot = db.query(ForecastSnapshot).filter(
            ForecastSnapshot.lead_id == lead_id,
            ForecastSnapshot.is_active == True
        ).first()

        if not snapshot:
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found")

            rm_name = None
            if lead.assigned_to:
                rm_user = db.query(User).filter(User.id == lead.assigned_to).first()
                if rm_user:
                    rm_name = rm_user.full_name

            return {
                "status": "success",
                "data": {
                    "id": f"lead-{lead.id}",
                    "lead_id": lead.id,
                    "deal_name": lead.lead_name,
                    "company_name": lead.company_name,
                    "loan_amount": float(lead.deal_value or lead.funding_amount or 0),
                    "expected_revenue": 0.0,
                    "weighted_revenue": 0.0,
                    "current_stage": lead.pipeline_stage or lead.lead_status,
                    "stage_probability": 0.0,
                    "pf_revenue": 0.0,
                    "platform_charges": 0.0,
                    "processing_charges": 0.0,
                    "tranche_charges": 0.0,
                    "documentation_charges": 0.0,
                    "advisory_fees": 0.0,
                    "mandate_fees": 0.0,
                    "renewal_charges": 0.0,
                    "other_charges": 0.0,
                    "revenue_sharing": 0.0,
                    "rm_name": rm_name,
                    "mandate_date": None,
                    "first_tranche_date": None,
                    "disbursement_date": None,
                    "status": lead.lead_status or "Active",
                    "updated_at": (lead.updated_at or lead.created_at or datetime.utcnow()).isoformat(),
                    "audit_trail": []
                }
            }

        # Get audit trail
        audits = db.query(ForecastAuditTrail).filter(
            ForecastAuditTrail.lead_id == lead_id
        ).order_by(ForecastAuditTrail.created_at.desc()).all()

        return {
            "status": "success",
            "data": {
                "id": str(snapshot.id),
                "lead_id": snapshot.lead_id,
                "deal_name": snapshot.deal_name,
                "company_name": snapshot.company_name,
                "loan_amount": float(snapshot.loan_amount),
                "expected_revenue": float(snapshot.expected_revenue or 0),
                "weighted_revenue": float(snapshot.weighted_revenue or 0),
                "current_stage": snapshot.current_stage,
                "stage_probability": snapshot.current_stage_probability,
                "pf_revenue": float(snapshot.pf_revenue or 0),
                "platform_charges": float(snapshot.platform_charges or 0),
                "processing_charges": float(snapshot.processing_charges or 0),
                "tranche_charges": float(snapshot.tranche_charges or 0),
                "documentation_charges": float(snapshot.documentation_charges or 0),
                "advisory_fees": float(snapshot.advisory_fees or 0),
                "mandate_fees": float(snapshot.mandate_fees or 0),
                "renewal_charges": float(snapshot.renewal_charges or 0),
                "other_charges": float(snapshot.other_commercial_charges or 0),
                "revenue_sharing": float(snapshot.revenue_sharing or 0),
                "rm_name": snapshot.relationship_manager_name,
                "mandate_date": snapshot.mandate_date.isoformat() if snapshot.mandate_date else None,
                "first_tranche_date": snapshot.first_tranche_date.isoformat() if snapshot.first_tranche_date else None,
                "disbursement_date": snapshot.expected_disbursement_date.isoformat() if snapshot.expected_disbursement_date else None,
                "status": snapshot.status,
                "updated_at": snapshot.updated_at.isoformat(),
                "audit_trail": [
                    {
                        "change_type": a.change_type,
                        "field": a.field_name,
                        "previous_value": a.previous_value,
                        "new_value": a.new_value,
                        "changed_by": a.changed_by_name,
                        "reason": a.reason,
                        "created_at": a.created_at.isoformat()
                    } for a in audits
                ]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/revenue-override")
async def apply_revenue_override(
    lead_id: int,
    field_name: str,
    new_value: float,
    reason: Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply revenue override for a deal"""
    try:
        snapshot = db.query(ForecastSnapshot).filter(
            ForecastSnapshot.lead_id == lead_id,
            ForecastSnapshot.is_active == True
        ).first()
        
        if not snapshot:
            raise HTTPException(status_code=404, detail="Forecast snapshot not found")
        
        # Record previous value
        previous_value = getattr(snapshot, field_name, None)
        
        # Update field
        if hasattr(snapshot, field_name):
            setattr(snapshot, field_name, new_value)
            snapshot.updated_at = datetime.utcnow()
            
            # Calculate revenue impact
            revenue_impact = new_value - (previous_value or 0)
            
            # Record audit trail
            engine = ForecastCalculationEngine(db)
            engine.record_audit_trail(
                lead_id=lead_id,
                change_type="revenue_override",
                field_name=field_name,
                previous_value=str(previous_value),
                new_value=str(new_value),
                changed_by=str(current_user.id),
                changed_by_name=current_user.full_name,
                reason=reason,
                revenue_impact=abs(revenue_impact)
            )
            
            db.commit()
            db.refresh(snapshot)
        else:
            raise HTTPException(status_code=400, detail=f"Field {field_name} not found")
        
        return {
            "status": "success",
            "message": "Revenue override applied successfully",
            "snapshot_id": str(snapshot.id),
            "expected_revenue": float(snapshot.expected_revenue),
            "weighted_revenue": float(snapshot.weighted_revenue)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail/{lead_id}")
async def get_audit_trail(
    lead_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get audit trail for a deal"""
    try:
        total = db.query(ForecastAuditTrail).filter(
            ForecastAuditTrail.lead_id == lead_id
        ).count()
        
        audits = db.query(ForecastAuditTrail).filter(
            ForecastAuditTrail.lead_id == lead_id
        ).order_by(ForecastAuditTrail.created_at.desc()).offset(skip).limit(limit).all()
        
        audit_list = [
            {
                "id": str(a.id),
                "change_type": a.change_type,
                "field": a.field_name,
                "previous_value": a.previous_value,
                "new_value": a.new_value,
                "revenue_impact": float(a.revenue_impact or 0),
                "changed_by": a.changed_by_name,
                "approval_status": a.approval_status,
                "reason": a.reason,
                "created_at": a.created_at.isoformat()
            } for a in audits
        ]
        
        return {
            "status": "success",
            "data": audit_list,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
