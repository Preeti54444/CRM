import pandas as pd
from app.database import SessionLocal
from app.models.lender_product import LenderProduct

# Read the Excel file
excel_file = r'c:\Users\Sneha\Downloads\Lenders_SCF_Products (2) (1).xlsx'
df = pd.read_excel(excel_file)

# Create database session
db = SessionLocal()

try:
    # Clear existing data
    db.query(LenderProduct).delete()
    db.commit()
    print("Cleared existing lender products")

    # Insert new data
    products_to_insert = []
    for _, row in df.iterrows():
        product = LenderProduct(
            lender_name=row.get('Lender Name'),
            product_name=row.get('Product Name'),
            loan_amount_range=row.get('Loan Amount Range'),
            roi_interest_rate=row.get('ROI/Interest Rate'),
            tenure=row.get('Tenure'),
            minimum_turnover=row.get('Minimum Turnover'),
            business_vintage=row.get('Business Vintage'),
            processing_fee=row.get('Processing Fee'),
            key_features=row.get('Key Features'),
            key_eligibility_criteria=row.get('Key Eligibility Criteria'),
            product_category=row.get('Product Category'),
            sub_product=row.get('Sub-Product'),
            locations_working_in=row.get('Locations Working In'),
            preferred_industry=row.get('Preferred Industry'),
            negative_industries=row.get('Negative Industries'),
            minimum_cibil_credit_score=row.get('Minimum CIBIL / Credit Score'),
            minimum_credit_rating_grade=row.get('Minimum Credit Rating Grade (BBB- & Above)'),
            primary_security_collateral=row.get('Primary Security / Collateral'),
            guarantee_requirement=row.get('Guarantee Requirement')
        )
        products_to_insert.append(product)

    db.add_all(products_to_insert)
    db.commit()
    print(f"Successfully imported {len(products_to_insert)} lender products")

except Exception as e:
    db.rollback()
    print(f"Error importing lender products: {e}")
    raise
finally:
    db.close()
