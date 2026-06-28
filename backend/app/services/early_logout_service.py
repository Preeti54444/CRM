from datetime import datetime
from typing import Literal
import logging

from sqlalchemy.orm import Session

from ..models.early_logout_request import EarlyLogoutRequest
from ..models.user import User

logger = logging.getLogger(__name__)


def get_active_early_logout_request(db: Session, requester: User) -> EarlyLogoutRequest | None:
    return (
        db.query(EarlyLogoutRequest)
        .filter(EarlyLogoutRequest.requester_id == requester.id)
        .order_by(EarlyLogoutRequest.requested_at.desc())
        .first()
    )


def create_early_logout_request(
    db: Session,
    requester: User,
    work_seconds: int,
    request_reason: str | None = None,
) -> EarlyLogoutRequest:
    requester_name_display = (getattr(requester, 'full_name', None) or getattr(requester, 'name', None) or getattr(requester, 'display_name', None))
    logger.info(f'[Early Logout] Creating request for user {requester.id} ({requester_name_display}) with {work_seconds} seconds worked')
    existing = (
        db.query(EarlyLogoutRequest)
        .filter(
            EarlyLogoutRequest.requester_id == requester.id,
            EarlyLogoutRequest.status == 'pending',
        )
        .order_by(EarlyLogoutRequest.requested_at.desc())
        .first()
    )
    if existing is not None:
        logger.warning(f'[Early Logout] User {requester.id} already has pending request {existing.id}')
        raise ValueError('An earlier logout request is already pending review.')

    request = EarlyLogoutRequest(
        status='pending',
        request_reason=request_reason,
        work_seconds=work_seconds,
        requester_id=requester.id,
        requester_name=(getattr(requester, 'full_name', None) or getattr(requester, 'name', None) or getattr(requester, 'display_name', None)),
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    logger.info(f'[Early Logout] Successfully created request {request.id} for user {requester.id}')
    return request


def get_early_logout_request_by_id(db: Session, request_id: int) -> EarlyLogoutRequest | None:
    return db.query(EarlyLogoutRequest).filter(EarlyLogoutRequest.id == request_id).first()


def review_early_logout_request(
    db: Session,
    reviewer: User,
    request_id: int,
    decision: Literal['approved', 'rejected'],
    comment: str | None = None,
) -> EarlyLogoutRequest:
    logger.info(f'[Early Logout] Reviewing request {request_id} by reviewer {reviewer.id} with decision: {decision}')
    request = get_early_logout_request_by_id(db, request_id)
    if request is None:
        logger.error(f'[Early Logout] Request {request_id} not found')
        raise ValueError('Early logout request not found.')
    if request.status != 'pending':
        logger.warning(f'[Early Logout] Request {request_id} already reviewed with status {request.status}')
        raise ValueError('This request has already been reviewed.')

    request.status = decision
    request.review_comment = comment
    request.reviewer_id = reviewer.id
    request.reviewer_name = (getattr(reviewer, 'full_name', None) or getattr(reviewer, 'name', None) or getattr(reviewer, 'display_name', None))
    request.reviewed_at = datetime.utcnow()
    request.updated_at = datetime.utcnow()
    db.add(request)
    db.commit()
    db.refresh(request)
    logger.info(f'[Early Logout] Successfully updated request {request_id} to status: {decision}')
    return request


def list_early_logout_requests(db: Session) -> list[EarlyLogoutRequest]:
    requests = db.query(EarlyLogoutRequest).filter(EarlyLogoutRequest.status == 'pending').order_by(EarlyLogoutRequest.requested_at.desc()).limit(200).all()
    logger.info(f'[Early Logout] Retrieved {len(requests)} pending requests')
    return requests
