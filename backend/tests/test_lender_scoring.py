import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import importlib.util
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lender_models import Base, Lender


@pytest.fixture(scope='module')
def in_memory_db():
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_score_simple_rule(in_memory_db):
    session = in_memory_db
    lender = Lender(name='TestBank', min_turnover=1000000, ticket_min=100000, ticket_max=5000000, min_cibil=650)
    session.add(lender)
    session.commit()
    fetched = session.query(Lender).filter_by(name='TestBank').first()
    assert fetched.min_turnover == 1000000
    assert fetched.min_cibil == 650


def test_score_function_basic():
    from lender_service import score_lender_against_req

    class Dummy:
        def __init__(self):
            self.min_vintage = 2
            self.min_turnover = 1000000
            self.ticket_min = 0
            self.ticket_max = 10000000
            self.eligible_types = ['manufacturing', 'trading']
            self.min_cibil = 650
            self.min_dscr = 1.0
            self.requires_atnw_positive = False
            self.requires_owned_property = False
            self.name = 'TestBank'
            self.roi = '12%'
            self.id = 123

    lender = Dummy()
    req = {
        'vintage_years': 3,
        'annual_turnover_cr': 20,
        'loan_amount_lakhs': 500,
        'business_type': 'manufacturing',
        'cibil': 700,
        'dscr': 1.2,
        'atnw_positive': True,
        'owned_property': True,
        'sector': 'manufacturing'
    }
    out = score_lender_against_req(lender, req)
    assert out['match_score'] > 0
    assert out['approval_probability'] > 0
    assert 'lender_id' in out and out['lender_id'] == 123


def test_weighted_scoring_uses_multiple_signals():
    from lender_service import score_lender_against_req

    class Dummy:
        def __init__(self):
            self.min_vintage = 2
            self.min_turnover = 5000000
            self.ticket_min = 1000000
            self.ticket_max = 20000000
            self.eligible_types = ['manufacturing']
            self.min_cibil = 700
            self.min_dscr = 1.0
            self.requires_atnw_positive = True
            self.requires_owned_property = False
            self.name = 'Growth Capital'
            self.roi = '11.5%'
            self.id = 321
            self.historical_approval_rate = 0.91
            self.average_approval_days = 2
            self.average_disbursement_days = 4
            self.processing_fee = 1.25
            self.products = ['WCTL', 'STF']

    lender = Dummy()
    req = {
        'vintage_years': 5,
        'annual_turnover_cr': 30,
        'loan_amount_lakhs': 800,
        'business_type': 'manufacturing',
        'cibil': 750,
        'dscr': 1.4,
        'atnw_positive': True,
        'owned_property': True,
        'sector': 'manufacturing'
    }
    out = score_lender_against_req(lender, req)
    assert out['match_score'] >= 80
    assert out['eligibility_pct'] >= 90
    assert out['approval_probability'] >= 0.8
    assert out['reasons']


def test_build_recommendation_explains_history():
    from lender_service import build_lender_recommendation

    class Dummy:
        def __init__(self):
            self.min_vintage = 1
            self.min_turnover = 1000000
            self.ticket_min = 100000
            self.ticket_max = 50000000
            self.eligible_types = ['manufacturing', 'trading']
            self.min_cibil = 650
            self.min_dscr = 1.0
            self.requires_atnw_positive = False
            self.requires_owned_property = False
            self.name = 'BrightBank'
            self.roi = '10.5%'
            self.id = 555
            self.historical_approval_rate = 0.89
            self.average_approval_days = 3
            self.average_disbursement_days = 5
            self.processing_fee = 0.9
            self.products = ['WCTL']

    lender = Dummy()
    req = {
        'vintage_years': 3,
        'annual_turnover_cr': 25,
        'loan_amount_lakhs': 400,
        'business_type': 'manufacturing',
        'cibil': 720,
        'dscr': 1.3,
        'atnw_positive': True,
        'owned_property': False,
        'sector': 'manufacturing'
    }
    out = build_lender_recommendation(lender, req)
    assert out['match_score'] >= 70
    assert 'Historical approval' in out['reason']
    assert out['expected_roi']


def test_score_function_respects_product_type():
    from lender_service import score_lender_against_req

    class Dummy:
        def __init__(self):
            self.min_vintage = 1
            self.min_turnover = 1000000
            self.ticket_min = 100000
            self.ticket_max = 50000000
            self.eligible_types = ['manufacturing', 'trading']
            self.min_cibil = 650
            self.min_dscr = 1.0
            self.requires_atnw_positive = False
            self.requires_owned_property = False
            self.name = 'ProductFitBank'
            self.roi = '13%'
            self.id = 999
            self.historical_approval_rate = 0.75
            self.average_approval_days = 3
            self.average_disbursement_days = 5
            self.processing_fee = 1.5
            self.products = ['Working Capital', 'WCTL']

    lender = Dummy()
    req = {
        'vintage_years': 3,
        'annual_turnover_cr': 25,
        'loan_amount_lakhs': 200,
        'business_type': 'manufacturing',
        'cibil': 700,
        'dscr': 1.2,
        'atnw_positive': True,
        'owned_property': True,
        'sector': 'manufacturing',
        'product_type': 'Working Capital'
    }
    out = score_lender_against_req(lender, req)
    assert 'Product match' in out['reasons']
    assert out['match_score'] >= 60
