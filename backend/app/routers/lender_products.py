from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.lender_product import LenderProductCreate, LenderProductResponse
from ..models.lender_product import LenderProduct

router = APIRouter(prefix="", tags=["lender_products"])


@router.post("/lender-products", response_model=LenderProductResponse, status_code=status.HTTP_201_CREATED)
def create_lender_product(product: LenderProductCreate, db: Session = Depends(get_db)):
    try:
        db_product = LenderProduct(**product.dict())
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lender-products", response_model=List[LenderProductResponse])
def list_lender_products(
    lender_name: Optional[str] = None,
    product_category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(LenderProduct)
    
    if lender_name:
        query = query.filter(LenderProduct.lender_name.ilike(f"%{lender_name}%"))
    
    if product_category:
        query = query.filter(LenderProduct.product_category.ilike(f"%{product_category}%"))
    
    return query.all()


@router.get("/lender-products/{product_id}", response_model=LenderProductResponse)
def get_lender_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(LenderProduct).filter(LenderProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender product not found")
    return product


@router.put("/lender-products/{product_id}", response_model=LenderProductResponse)
def update_lender_product(product_id: int, product: LenderProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(LenderProduct).filter(LenderProduct.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender product not found")
    
    try:
        for key, value in product.dict().items():
            setattr(db_product, key, value)
        db.commit()
        db.refresh(db_product)
        return db_product
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/lender-products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lender_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(LenderProduct).filter(LenderProduct.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender product not found")
    
    try:
        db.delete(db_product)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
