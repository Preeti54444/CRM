from typing import List
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_manager_or_admin
from ..schemas.early_logout import (
    EarlyLogoutRequestCreate,
    EarlyLogoutRequestReview,
    EarlyLogoutRequestResponse,
)
from ..services.early_logout_service import (
    create_early_logout_request,
    get_early_logout_request_by_id,
    get_active_early_logout_request,
    list_early_logout_requests,
    review_early_logout_request,
)

router = APIRouter(prefix="/timer", tags=["timer"])
logger = logging.getLogger(__name__)


@router.post("/early-logout/request", response_model=EarlyLogoutRequestResponse, status_code=status.HTTP_201_CREATED)
def request_early_logout(
    payload: EarlyLogoutRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info(f'[Router] POST /early-logout/request - User: {current_user.id}, Work seconds: {payload.work_seconds}')
    try:
        request = create_early_logout_request(
            db,
            requester=current_user,
            work_seconds=payload.work_seconds,
            request_reason=payload.request_reason,
        )
        logger.info(f'[Router] Successfully created request {request.id}')
    except ValueError as exc:
        logger.error(f'[Router] Error creating request: {exc}')
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return request


@router.get("/early-logout/pending", response_model=EarlyLogoutRequestResponse)
def get_pending_early_logout_request(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    request = get_active_early_logout_request(db, requester=current_user)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending early logout request found")
    return request


@router.get("/early-logout/requests", response_model=List[EarlyLogoutRequestResponse])
def list_early_logout_requests_route(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    logger.info(f'[Router] GET /early-logout/requests - User: {current_user.id}')
    requests = list_early_logout_requests(db)
    logger.info(f'[Router] Returning {len(requests)} pending requests')
    return requests


@router.post("/early-logout/review", response_model=EarlyLogoutRequestResponse)
def review_early_logout_request_route(
    payload: EarlyLogoutRequestReview,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager_or_admin),
):
    logger.info(f'[Router] POST /early-logout/review - User: {current_user.id}, Request ID: {payload.request_id}, Decision: {payload.decision}')
    try:
        request = review_early_logout_request(
            db,
            reviewer=current_user,
            request_id=payload.request_id,
            decision=payload.decision,
            comment=payload.comment,
        )
        logger.info(f'[Router] Successfully reviewed request {request.id}')
    except ValueError as exc:
        logger.error(f'[Router] Error reviewing request: {exc}')
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return request
