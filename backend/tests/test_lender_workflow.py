import asyncio
import pathlib
import sys
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lender_models import Base as LenderBase, Lender, LeadLenderRequirements
from app.database import Base as AppBase
from app.models.customer_profile import CustomerProfile
from app.models.forecast import ForecastSnapshot, PipelineStageConfig
from app.models.lead import Lead
from app.models.pipeline_configuration import PipelineConfiguration
from app.models.pipeline_transition_audit import PipelineTransitionAudit
from app.models.timeline import TimelineEvent
from app.routers.forecast import get_deal_details, save_commercial_revenue_details
from app.schemas.lead import LeadUpdate
from app.services.lead_service import update_lead
from lender_service import complete_lender_workflow


def make_session():
    engine = create_engine('sqlite:///:memory:')
    LenderBase.metadata.create_all(engine)
    AppBase.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_complete_lender_workflow_creates_case_and_forecast():
    session = make_session()

    lead = Lead(lead_name='Acme', company_name='Acme Corp', lead_status='Login with Lender')
    session.add(lead)
    session.commit()
    session.refresh(lead)

    lender = Lender(name='Test Bank', slug='test-bank', min_turnover=50.0, ticket_min=1000000, ticket_max=5000000, min_cibil=700, roi='12%')
    session.add(lender)
    session.commit()
    session.refresh(lender)

    session.add(LeadLenderRequirements(lead_id=str(lead.id), data={
        'business_type': 'manufacturing',
        'vintage_years': 3,
        'annual_turnover_cr': 20,
        'cibil': 720,
        'atnw_positive': True,
        'dscr': 1.2,
        'loan_amount_lakhs': 400,
        'loan_tenure_days': 90,
        'owned_property': False,
        'sector': 'manufacturing',
    }))
    session.commit()

    result = complete_lender_workflow(
        session,
        lead_id=str(lead.id),
        lender_id=lender.id,
        selected_lender_name=lender.name,
        payload={'note': 'Ready for portal login'},
    )

    assert result['workflow_complete'] is True
    assert result['lead_status'] == 'Bank Selected'
    assert result['mapping_id'] is not None
    assert result['lender_case_id'] is not None
    assert result['forecast_id'] is not None

    updated_lead = session.query(Lead).filter(Lead.id == lead.id).first()
    assert updated_lead.lead_status == 'Bank Selected'


def test_updating_lead_to_login_with_lender_creates_deal_snapshot():
    session = make_session()

    lead = Lead(
        lead_name='Acme',
        company_name='Acme Corp',
        lead_status='New',
        pipeline_stage='New Leads',
        deal_value=1000000,
    )
    session.add(lead)
    session.commit()
    session.refresh(lead)

    session.add(PipelineStageConfig(stage_name='Login with Lender', stage_order=1, forecast_probability=0.6))
    session.commit()

    updated = update_lead(
        session,
        lead,
        LeadUpdate(lead_status='Login with Lender', pipeline_stage='Login with Lender'),
        updater_id=uuid.UUID('b15258ad-e73d-4a0d-8dbe-9628364e858d'),
    )

    assert updated.lead_status == 'Login with Lender'
    assert updated.pipeline_stage == 'Login with Lender'

    snapshot = session.query(ForecastSnapshot).filter(
        ForecastSnapshot.lead_id == lead.id,
        ForecastSnapshot.is_active == True,
    ).first()
    assert snapshot is not None
    assert snapshot.current_stage == 'Login with Lender'
    assert float(snapshot.loan_amount) == 1000000


def test_save_commercial_revenue_details_recalculates_snapshot():
    session = make_session()

    lead = Lead(
        lead_name='Acme',
        company_name='Acme Corp',
        lead_status='Bank Selected',
        pipeline_stage='Login with Lender',
        deal_value=1000000,
    )
    session.add(lead)
    session.commit()
    session.refresh(lead)

    session.add(PipelineStageConfig(stage_name='Login with Lender', stage_order=1, forecast_probability=0.6))
    session.commit()

    session.add(ForecastSnapshot(
        lead_id=lead.id,
        deal_name=lead.lead_name,
        company_name=lead.company_name,
        loan_amount=1000000,
        current_stage='Login with Lender',
        current_stage_probability=0.6,
        expected_revenue=0,
        weighted_revenue=0,
        pf_revenue=0,
        platform_charges=0,
        processing_charges=0,
        tranche_charges=0,
        documentation_charges=0,
        advisory_fees=0,
        mandate_fees=0,
        renewal_charges=0,
        other_commercial_charges=0,
        revenue_sharing=0,
    ))
    session.commit()

    payload = {
        'loan_amount': 1000000,
        'pf_percentage': 2,
        'revenue_share_percentage': 15,
        'platform_charges': 5000,
        'tranche_charges': 15000,
        'advisory_fees': 10000,
        'renewal_charges': 2000,
        'other_charges': 3000,
        'override_reason': 'Commercial details captured',
        'remarks': 'Auto calcs from lender flow',
    }

    response = asyncio.run(save_commercial_revenue_details(
        lead_id=lead.id,
        payload=payload,
        current_user=None,
        db=session,
    ))

    assert response['status'] == 'success'
    assert response['data']['expected_revenue'] == 52000.0
    assert response['data']['weighted_revenue'] == 31200.0

    refreshed = session.query(ForecastSnapshot).filter(ForecastSnapshot.lead_id == lead.id, ForecastSnapshot.is_active == True).first()
    assert float(refreshed.expected_revenue) == 52000.0
    assert float(refreshed.weighted_revenue) == 31200.0


def test_get_deal_details_falls_back_to_lead_record_when_snapshot_missing():
    session = make_session()

    lead = Lead(
        lead_name='Acme',
        company_name='Acme Corp',
        lead_status='Bank Selected',
        pipeline_stage='Login with Lender',
        assigned_to=uuid.UUID('b15258ad-e73d-4a0d-8dbe-9628364e858d'),
    )
    session.add(lead)
    session.commit()
    session.refresh(lead)

    response = asyncio.run(get_deal_details(lead_id=lead.id, current_user=None, db=session))

    assert response['status'] == 'success'
    assert response['data']['lead_id'] == lead.id
    assert response['data']['deal_name'] == lead.lead_name
    assert response['data']['company_name'] == lead.company_name
