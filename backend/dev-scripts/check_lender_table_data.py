from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check lenders table structure and sample data
    result = conn.execute(text("SELECT * FROM lenders LIMIT 2"))
    lenders = result.fetchall()
    
    print("Lenders table columns:")
    columns = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'lenders'
        ORDER BY ordinal_position
    """)).fetchall()
    for col in columns:
        print(f"  {col[0]}: {col[1]}")
    
    print("\nSample lender data (first 2 rows):")
    for lender in lenders:
        print(f"  ID: {lender[0]}, Name: {lender[1]}, ROI: {lender[8]}, Min Turnover: {lender[4]}, Max Loan: {lender[5]}")
        print(f"  Products: {lender[16]}, Eligible Types: {lender[17]}, Security: {lender[27]}")
        print(f"  Processing Fee: {lender[24]}, Foreclosure: {lender[25]}, SLA: {lender[33]}")
        print()
    
    # Check lender_products table
    print("\nLender Products table columns:")
    columns = conn.execute(text("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'lender_products'
        ORDER BY ordinal_position
    """)).fetchall()
    for col in columns:
        print(f"  {col[0]}: {col[1]}")
    
    print("\nSample lender product data (first 2 rows):")
    result = conn.execute(text("SELECT * FROM lender_products LIMIT 2"))
    products = result.fetchall()
    for product in products:
        print(f"  ID: {product[0]}, Lender: {product[1]}, Product: {product[2]}, ROI: {product[5]}")
        print(f"  Loan Amount: {product[3]}, Tenure: {product[4]}, Features: {product[10]}")
        print()
