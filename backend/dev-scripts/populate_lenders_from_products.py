from app.database import engine, SessionLocal
from app.models.lender import Lender
from sqlalchemy import text
import json

db = SessionLocal()

try:
    # Get unique lenders from lender_products
    with engine.connect() as conn:
        lenders = conn.execute(text("""
            SELECT DISTINCT lender_name, 
                   ARRAY_AGG(DISTINCT product_name) as products,
                   ARRAY_AGG(DISTINCT preferred_industry) as industries
            FROM lender_products
            GROUP BY lender_name
        """)).fetchall()
        
        print(f"Found {len(lenders)} unique lenders in lender_products")
        
        for lender in lenders:
            lender_name = lender[0]
            products = lender[1] if lender[1] else []
            industries = lender[2] if lender[2] else []
            
            print(f"\nProcessing: {lender_name}")
            print(f"  Products: {products}")
            print(f"  Industries: {industries}")
            
            # Update using ORM
            try:
                db_lender = db.query(Lender).filter(Lender.name == lender_name).first()
                if db_lender:
                    db_lender.products = products
                    db_lender.eligible_types = industries
                    db_lender.security_requirement = 'Collateral-free (see individual products for details)'
                    db.commit()
                    print(f"  Updated successfully")
                else:
                    print(f"  Lender not found in database")
            except Exception as e:
                print(f"  Error: {e}")
                db.rollback()
    
    print("\nDone populating lenders table")
finally:
    db.close()
