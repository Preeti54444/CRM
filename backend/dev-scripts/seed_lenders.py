from lender_models import Lender
from db import engine, SessionLocal
from lender_models import Base

def seed():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    lenders = [
        {
            'name': 'Aditya Birla Capital',
            'slug': 'aditya-birla',
            'min_turnover': 20.0,  # crores
            'ticket_min': 200000000, # 20Cr
            'ticket_max': 300000000, # 30Cr
            'min_cibil': 700,
            'roi': '12.5-13.5%',
            'products': ['WCTL','PID','SID','TReDS'],
            'eligible_types': ['manufacturing','trading','services'],
            'min_vintage': 2
        },
        {
            'name': 'CredFund',
            'slug': 'credfund',
            'min_turnover': 150.0,
            'ticket_min': 5000000, # 5L
            'ticket_max': 15000000, # 15L (example)
            'min_cibil': 675,
            'roi': '14.5-18%',
            'products': ['PID','SID','Term Loan'],
            'eligible_types': ['trading','services'],
            'min_vintage': 3
        },
        {
            'name': 'CashFloat',
            'slug': 'cashfloat',
            'min_turnover': 150.0,
            'ticket_min': 5000000,
            'ticket_max': 15000000,
            'min_cibil': 650,
            'roi': '14.5-19%',
            'products': ['PID','SID','Anchor-led'],
            'eligible_types': ['trading','services'],
            'min_vintage': 2
        },
        {
            'name': 'AMBIT FINVEST',
            'slug': 'ambit',
            'min_turnover': 10.0,
            'ticket_min': 100000, # 1L
            'ticket_max': 7500000, # 75L
            'min_cibil': 700,
            'roi': 'market',
            'products': ['Business Loan (Unsecured)'],
            'eligible_types': ['manufacturing','trading','services'],
            'min_vintage': 1,
            'requires_owned_property': False
        },
        {
            'name': 'Ratnaafin',
            'slug': 'ratnaafin',
            'min_turnover': 40.0,
            'ticket_min': 1000000,
            'ticket_max': 10000000,
            'min_cibil': 0,
            'roi': '12.5-13.5%',
            'products': ['SCF','Anchor-led'],
            'eligible_types': ['trading','services','manufacturing'],
            'min_vintage': 2
        },
        {
            'name': 'Agrizy',
            'slug': 'agrizy',
            'min_turnover': 20.0,
            'ticket_min': 200000000,
            'ticket_max': 300000000,
            'min_cibil': 0,
            'roi': '9-18%',
            'products': ['STF','WRF','PID','SID'],
            'eligible_types': ['agri-food processing'],
            'min_vintage': 2
        }
    ]
    for l in lenders:
        exists = session.query(Lender).filter_by(name=l['name']).first()
        if not exists:
            obj = Lender(**l)
            session.add(obj)
    session.commit()
    session.close()

if __name__ == '__main__':
    seed()
