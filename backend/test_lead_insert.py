from app.database import SessionLocal
from app.models.lead import Lead
from app.schemas.lead import LeadCreate
from uuid import UUID
from datetime import datetime

db = SessionLocal()

try:
    # Test creating a lead with the exact payload from frontend
    payload = LeadCreate(
        lead_name="Test Lead",
        company_name="Test Company",
        mobile="1234567890",
        alternate_mobile="",
        email="",
        company_email="",
        city="",
        state="",
        product_type="",
        lead_source="Cold Calling",
        lead_status="New",
        assigned_to=None,
        remarks=""
    )
    
    print("Payload:", payload.dict())
    
    # Try to create the lead
    new_lead = Lead(
        lead_name=payload.lead_name,
        company_name=payload.company_name,
        mobile=payload.mobile,
        alternate_mobile=payload.alternate_mobile,
        email=payload.email,
        company_email=payload.company_email,
        city=payload.city,
        state=payload.state,
        product_type=payload.product_type,
        funding_amount=payload.funding_amount,
        lead_source=payload.lead_source,
        lead_status=payload.lead_status,
        assigned_to=payload.assigned_to,
        remarks=payload.remarks,
        created_by=UUID("5c0841e0-8083-41a1-a80e-b1e80f7f0052"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    print("Lead object created:", new_lead)
    
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    
    print("Lead created successfully:", new_lead.id)
    
except Exception as e:
    print(f"Error: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
