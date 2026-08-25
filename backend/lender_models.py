from sqlalchemy import Column, Integer, String, Text, Float, Boolean, JSON, ForeignKey, DateTime, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
import datetime

Base = declarative_base()


def ensure_lender_schema(engine) -> None:
    inspector = inspect(engine)
    if not inspector.has_table('lenders'):
        Base.metadata.create_all(bind=engine)
        return

    with engine.begin() as connection:
        columns = {column['name'] for column in inspector.get_columns('lenders')}
        column_definitions = [
            ('processing_fee', 'DOUBLE PRECISION', '0'),
            ('foreclosure_charges', 'DOUBLE PRECISION', '0'),
            ('hidden_charges', 'DOUBLE PRECISION', '0'),
            ('security_requirement', 'TEXT', 'NULL'),
            ('property_requirement', 'TEXT', 'NULL'),
            ('gst', 'TEXT', 'NULL'),
            ('pan', 'TEXT', 'NULL'),
            ('cin', 'TEXT', 'NULL'),
            ('priority_score', 'INTEGER', '0'),
            ('sla', 'TEXT', 'NULL'),
            ('average_approval_days', 'INTEGER', '0'),
            ('average_disbursement_days', 'INTEGER', '0'),
            ('historical_approval_rate', 'DOUBLE PRECISION', '0'),
            ('historical_rejection_rate', 'DOUBLE PRECISION', '0'),
            ('active_status', 'BOOLEAN', 'TRUE'),
            ('extra', 'JSON', 'NULL'),
        ]
        for column_name, sql_type, default in column_definitions:
            if column_name in columns:
                continue
            if sql_type == 'JSON':
                connection.execute(text(f"ALTER TABLE lenders ADD COLUMN {column_name} JSON"))
            else:
                connection.execute(text(f"ALTER TABLE lenders ADD COLUMN {column_name} {sql_type} DEFAULT {default}"))

        # Ensure supporting tables exist as well.
        Base.metadata.create_all(bind=engine)


def seed_default_lenders(session: Session) -> int:
    if session.query(Lender).count():
        return 0

    lenders = [
        {
            'name': 'Aditya Birla Capital',
            'slug': 'aditya-birla-capital',
            'min_turnover': 20.0,
            'ticket_min': 200000000,
            'ticket_max': 300000000,
            'min_cibil': 700,
            'roi': '12.5-13.5%',
            'products': ['WCTL', 'PID', 'SID', 'TReDS'],
            'eligible_types': ['manufacturing', 'trading', 'services'],
            'min_vintage': 2,
            'historical_approval_rate': 0.72,
            'processing_fee': 1.5,
            'active_status': True,
        },
        {
            'name': 'CredFund',
            'slug': 'credfund',
            'min_turnover': 150.0,
            'ticket_min': 5000000,
            'ticket_max': 15000000,
            'min_cibil': 675,
            'roi': '14.5-18%',
            'products': ['PID', 'SID', 'Term Loan'],
            'eligible_types': ['trading', 'services'],
            'min_vintage': 3,
            'historical_approval_rate': 0.68,
            'processing_fee': 2.0,
            'active_status': True,
        },
        {
            'name': 'CashFloat',
            'slug': 'cashfloat',
            'min_turnover': 150.0,
            'ticket_min': 5000000,
            'ticket_max': 15000000,
            'min_cibil': 650,
            'roi': '14.5-19%',
            'products': ['PID', 'SID', 'Anchor-led'],
            'eligible_types': ['trading', 'services'],
            'min_vintage': 2,
            'historical_approval_rate': 0.61,
            'processing_fee': 2.5,
            'active_status': True,
        },
    ]
    session.add_all(Lender(**lender) for lender in lenders)
    session.commit()
    return len(lenders)


class Lender(Base):
    __tablename__ = 'lenders'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    slug = Column(String, unique=True)
    logo = Column(String)
    min_turnover = Column(Float)
    max_loan = Column(Float)
    min_cibil = Column(Integer)
    roi = Column(String)
    products = Column(JSON, default=[])
    eligible_types = Column(JSON, default=[])
    ticket_min = Column(Float, default=0)
    ticket_max = Column(Float, default=0)
    min_vintage = Column(Integer, default=0)
    min_dscr = Column(Float, nullable=True)
    requires_atnw_positive = Column(Boolean, default=False)
    requires_owned_property = Column(Boolean, default=False)
    processing_fee = Column(Float, default=0)
    foreclosure_charges = Column(Float, default=0)
    hidden_charges = Column(Float, default=0)
    security_requirement = Column(String)
    property_requirement = Column(String)
    gst = Column(String)
    pan = Column(String)
    cin = Column(String)
    priority_score = Column(Integer, default=0)
    sla = Column(String)
    average_approval_days = Column(Integer, default=0)
    average_disbursement_days = Column(Integer, default=0)
    historical_approval_rate = Column(Float, default=0.0)
    historical_rejection_rate = Column(Float, default=0.0)
    active_status = Column(Boolean, default=True)
    extra = Column(JSON, default={})


class LenderProduct(Base):
    __tablename__ = 'lender_products'
    id = Column(Integer, primary_key=True)
    lender_id = Column(Integer, ForeignKey('lenders.id', ondelete='cascade'))
    name = Column(String)
    code = Column(String)
    description = Column(Text)
    min_ticket = Column(Float)
    max_ticket = Column(Float)
    roi = Column(String)


class LenderEligibilityRule(Base):
    __tablename__ = 'lender_eligibility_rules'
    id = Column(Integer, primary_key=True)
    lender_id = Column(Integer, ForeignKey('lenders.id', ondelete='cascade'))
    rule_name = Column(String)
    rule_json = Column(JSON)


class LeadLenderRequirements(Base):
    __tablename__ = 'lead_lender_requirements'
    id = Column(Integer, primary_key=True)
    lead_id = Column(String, index=True)
    data = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class LenderRecommendation(Base):
    __tablename__ = 'lender_recommendations'
    id = Column(Integer, primary_key=True)
    lead_id = Column(String, index=True)
    lender_id = Column(Integer, ForeignKey('lenders.id'))
    score = Column(Float)
    details = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class LeadLenderMapping(Base):
    __tablename__ = 'lead_lender_mapping'
    id = Column(Integer, primary_key=True)
    lead_id = Column(String, index=True)
    lender_id = Column(Integer, ForeignKey('lenders.id'))
    provider_portal = Column(String)
    status = Column(String, default='pending')
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
