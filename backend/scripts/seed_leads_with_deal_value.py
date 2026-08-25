import logging
from pathlib import Path
import sys
from datetime import datetime

from sqlalchemy.orm import sessionmaker

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from app.database import engine
from app.models.lead import Lead
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_session():
    return sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def find_admin_user(session):
    return session.query(User).filter(User.role == 'admin').first()


def seed_leads(session, creator_id):
    leads = [
        {
            'lead_name': 'Alpha Finance Company',
            'company_name': 'Alpha Finance',
            'mobile': '9810000001',
            'email': 'alpha@example.com',
            'city': 'Mumbai',
            'state': 'Maharashtra',
            'product_type': 'Business Loan',
            'funding_amount': 12000000,
            'lead_source': 'Referral',
            'lead_status': 'Proposal',
            'deal_value': 12000000,
            'remarks': 'High probability of close this quarter',
        },
        {
            'lead_name': 'Beta Retail LLP',
            'company_name': 'Beta Retail',
            'mobile': '9810000002',
            'email': 'beta@example.com',
            'city': 'Bengaluru',
            'state': 'Karnataka',
            'product_type': 'Working Capital',
            'funding_amount': 9500000,
            'lead_source': 'Website',
            'lead_status': 'Qualified',
            'deal_value': 9500000,
            'remarks': 'Customer wants finance within 15 days',
        },
        {
            'lead_name': 'Gamma Auto Services',
            'company_name': 'Gamma Auto',
            'mobile': '9810000003',
            'email': 'gamma@example.com',
            'city': 'Chennai',
            'state': 'Tamil Nadu',
            'product_type': 'Equipment Loan',
            'funding_amount': 7000000,
            'lead_source': 'Email Campaign',
            'lead_status': 'Negotiation',
            'deal_value': 7000000,
            'remarks': 'Awaiting final approval from lender',
        },
        {
            'lead_name': 'Delta Tech Pvt Ltd',
            'company_name': 'Delta Tech',
            'mobile': '9810000004',
            'email': 'delta@example.com',
            'city': 'Pune',
            'state': 'Maharashtra',
            'product_type': 'Term Loan',
            'funding_amount': 18500000,
            'lead_source': 'Field Sales',
            'lead_status': 'Disbursed',
            'deal_value': 18500000,
            'remarks': 'Deal closed and funds disbursed',
        }
    ]

    inserted = 0
    for lead_data in leads:
        lead = Lead(
            lead_name=lead_data['lead_name'],
            company_name=lead_data['company_name'],
            mobile=lead_data['mobile'],
            email=lead_data['email'],
            city=lead_data['city'],
            state=lead_data['state'],
            product_type=lead_data['product_type'],
            funding_amount=lead_data['funding_amount'],
            lead_source=lead_data['lead_source'],
            lead_status=lead_data['lead_status'],
            deal_value=lead_data['deal_value'],
            remarks=lead_data['remarks'],
            created_by=creator_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(lead)
        inserted += 1

    session.commit()
    logger.info('Inserted %d leads with deal_value', inserted)


def main():
    Session = get_session()
    with Session() as session:
        admin = find_admin_user(session)
        if not admin:
            logger.error('No admin user found in database. Seed an admin user first.')
            return

        existing_count = session.query(Lead).count()
        logger.info('Existing leads count: %d', existing_count)
        if existing_count > 0:
            logger.warning('Database already has leads. The script will still insert additional seed leads.')

        seed_leads(session, admin.id)


if __name__ == '__main__':
    main()
