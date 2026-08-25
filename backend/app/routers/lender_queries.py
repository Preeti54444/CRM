from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..models.lender_query import LenderQuery
from ..schemas.lead_schemas import LenderQueryCreate, LenderQueryResponse

router = APIRouter(prefix="/lender-queries", tags=["lender_queries"])


@router.post("", response_model=LenderQueryResponse, status_code=status.HTTP_201_CREATED)
def create_lender_query(payload: LenderQueryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not payload.application_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="application_id is required")

    query_id = payload.query_id or f"Q-{str(uuid4())[:8].upper()}"
    lender_query = LenderQuery(
        query_id=query_id,
        application_id=payload.application_id,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        assigned_handler=payload.assigned_handler,
        required_documents=payload.required_documents,
        created_by=current_user.id,
    )
    db.add(lender_query)
    db.commit()
    db.refresh(lender_query)
    return lender_query


@router.get("/lead/{application_id}", response_model=List[LenderQueryResponse])
def get_lender_queries_by_application(application_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    queries = (
        db.query(LenderQuery)
        .filter(LenderQuery.application_id == application_id)
        .order_by(LenderQuery.created_at.desc())
        .all()
    )
    return queries


@router.get("/{query_id}", response_model=LenderQueryResponse)
def get_lender_query(query_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    query = db.query(LenderQuery).filter(LenderQuery.query_id == query_id).first()
    if not query:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lender query not found")
    return query
