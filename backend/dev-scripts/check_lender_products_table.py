from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check lender_products table data
    print("Lender Products table data (first 5 rows):")
    result = conn.execute(text("""
        SELECT id, lender_name, product_name, loan_amount_range, roi_interest_rate, 
               tenure, minimum_turnover, business_vintage, key_features, 
               key_eligibility_criteria, preferred_industry, primary_security_collateral
        FROM lender_products 
        LIMIT 5
    """))
    products = result.fetchall()
    
    for product in products:
        print(f"  ID: {product[0]}, Lender: {product[1]}, Product: {product[2]}")
        print(f"  Loan Amount: {product[3]}, ROI: {product[4]}, Tenure: {product[5]}")
        print(f"  Min Turnover: {product[6]}, Vintage: {product[7]}")
        print(f"  Features: {product[8][:100] if product[8] else 'N/A'}...")
        print()
    
    # Count total
    count = conn.execute(text("SELECT COUNT(*) FROM lender_products")).scalar()
    print(f"Total lender products: {count}")
    
    # Count unique lenders
    unique_lenders = conn.execute(text("SELECT COUNT(DISTINCT lender_name) FROM lender_products")).scalar()
    print(f"Unique lenders in lender_products: {unique_lenders}")
