from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.lender_case import LenderCaseCreate, LenderCaseResponse
from ..services.lender_case_service import create_lender_case, list_lender_cases_for_lead, get_lender_case_by_application_id, delete_lender_case

router = APIRouter(prefix="", tags=["lender_cases"]) 


@router.post("/lender", response_model=LenderCaseResponse)
def create_lender(case: LenderCaseCreate, db: Session = Depends(get_db)):
    try:
        lc = create_lender_case(db, case.dict())
        return lc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lender", response_model=List[LenderCaseResponse])
def list_lenders(lead_id: Optional[int] = None, db: Session = Depends(get_db)):
    rows = list_lender_cases_for_lead(db, lead_id)
    return rows


@router.delete("/lender/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lender(application_id: str, db: Session = Depends(get_db)):
    obj = get_lender_case_by_application_id(db, application_id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender case not found")
    delete_lender_case(db, obj)
    return None
