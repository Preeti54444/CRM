from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Drop the existing table
    conn.execute(text('DROP TABLE IF EXISTS lender_products'))
    conn.commit()
    print('Dropped existing lender_products table')

    # Recreate with the correct structure
    conn.execute(text('''
        CREATE TABLE lender_products (
            id SERIAL PRIMARY KEY,
            lender_name VARCHAR(255) NOT NULL,
            product_name VARCHAR(255),
            loan_amount_range VARCHAR(255),
            roi_interest_rate VARCHAR(255),
            tenure VARCHAR(255),
            minimum_turnover VARCHAR(255),
            business_vintage VARCHAR(255),
            processing_fee VARCHAR(255),
            key_features TEXT,
            key_eligibility_criteria TEXT,
            product_category VARCHAR(255),
            sub_product VARCHAR(255),
            locations_working_in VARCHAR(255),
            preferred_industry TEXT,
            negative_industries TEXT,
            minimum_cibil_credit_score VARCHAR(255),
            minimum_credit_rating_grade VARCHAR(255),
            primary_security_collateral TEXT,
            guarantee_requirement TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    '''))
    conn.commit()
    print('Created new lender_products table with correct structure')
