from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.lender import Lender
from app.schemas.lender import LenderCreate, LenderUpdate, LenderResponse

router = APIRouter(prefix="/lenders-management", tags=["lenders"])


@router.get("/", response_model=List[LenderResponse])
def get_lenders(db: Session = Depends(get_db)):
    """Get all lenders"""
    try:
        lenders = db.query(Lender).order_by(Lender.name).all()
        return lenders
    except Exception as e:
        print(f"Error fetching lenders: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{lender_id}", response_model=LenderResponse)
def get_lender(lender_id: int, db: Session = Depends(get_db)):
    """Get a specific lender by ID"""
    lender = db.query(Lender).filter(Lender.id == lender_id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender not found")
    return lender


@router.post("/", response_model=LenderResponse)
def create_lender(lender: LenderCreate, db: Session = Depends(get_db)):
    """Create a new lender"""
    # Check if slug already exists
    if lender.slug:
        existing = db.query(Lender).filter(Lender.slug == lender.slug).first()
        if existing:
            raise HTTPException(status_code=400, detail="Lender with this slug already exists")
    
    # Generate slug from name if not provided
    if not lender.slug:
        lender.slug = lender.name.lower().replace(" ", "-").replace("/", "-")
    
    db_lender = Lender(**lender.dict())
    db.add(db_lender)
    db.commit()
    db.refresh(db_lender)
    return db_lender


@router.put("/{lender_id}", response_model=LenderResponse)
def update_lender(lender_id: int, lender: LenderUpdate, db: Session = Depends(get_db)):
    """Update an existing lender"""
    db_lender = db.query(Lender).filter(Lender.id == lender_id).first()
    if not db_lender:
        raise HTTPException(status_code=404, detail="Lender not found")
    
    # Check if slug already exists (if changing slug)
    if lender.slug and lender.slug != db_lender.slug:
        existing = db.query(Lender).filter(Lender.slug == lender.slug).first()
        if existing:
            raise HTTPException(status_code=400, detail="Lender with this slug already exists")
    
    for key, value in lender.dict(exclude_unset=True).items():
        setattr(db_lender, key, value)
    
    db.commit()
    db.refresh(db_lender)
    return db_lender


@router.delete("/{lender_id}")
def delete_lender(lender_id: int, db: Session = Depends(get_db)):
    """Delete a lender"""
    db_lender = db.query(Lender).filter(Lender.id == lender_id).first()
    if not db_lender:
        raise HTTPException(status_code=404, detail="Lender not found")
    
    db.delete(db_lender)
    db.commit()
    return {"message": "Lender deleted successfully"}
