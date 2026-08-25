from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import text
from ..database import engine
from ..dependencies import get_db
from sqlalchemy.orm import Session
from lender_models import LenderRecommendation, Lender
from ..auth.dependencies import get_current_user
from lender_models import LeadLenderMapping, Lender
from sqlalchemy.orm import Session
from ..dependencies import get_db

router = APIRouter(prefix="/lenders", tags=["lenders"])


class LeadInput(BaseModel):
    loan_amount: Optional[float] = None
    turnover: Optional[float] = None
    cibil: Optional[int] = None
    industry: Optional[str] = None
    product: Optional[str] = None
    tenure: Optional[int] = None


def parse_money(value):
    if value is None:
        return None
    textv = str(value).strip().lower()
    if not textv:
        return None
    # remove common tokens
    for ch in [',', '₹', '+', 'upto', 'up to', 'approx']:
        textv = textv.replace(ch, '')
    import re
    m = re.search(r'([0-9]+(?:\.[0-9]+)?)', textv)
    if not m:
        return None
    return float(m.group(1))


def parse_range(value):
    if value is None:
        return None, None
    textv = str(value).strip().lower()
    if not textv:
        return None, None
    import re
    parts = re.split(r'[-–—]| to |\s+to\s+', textv)
    if len(parts) == 2:
        return parse_money(parts[0]) or None, parse_money(parts[1]) or None
    # single value
    val = parse_money(textv)
    return val, val


def parse_processing_fee(value):
    """Try to parse a processing fee expressed as a percentage like '1-2%' or '2%'.
    Returns a single float if parseable, else None.
    """
    if not value:
        return None
    textv = str(value).lower()
    import re
    m = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*%', textv)
    if m:
        try:
            return float(m.group(1))
        except Exception:
            return None
    # try single number without percent
    m2 = re.search(r'([0-9]+(?:\.[0-9]+)?)', textv)
    if m2:
        try:
            return float(m2.group(1))
        except Exception:
            return None
    return None


def parse_roi(value):
    """Extract a numeric ROI (prefer lower). Return lowest numeric percent if a range present."""
    if not value:
        return None
    textv = str(value).lower()
    import re
    # find all percent numbers
    nums = [float(m.group(1)) for m in re.finditer(r'([0-9]+(?:\.[0-9]+)?)\s*%?', textv)]
    if not nums:
        return None
    return min(nums)


def matches_industry(preferred_industry, lead_industry):
    if not preferred_industry or not lead_industry:
        return False
    try:
        # split common separators
        parts = [p.strip().lower() for p in str(preferred_industry).split(',') if p.strip()]
        return any(p in lead_industry.lower() for p in parts)
    except Exception:
        return False


@router.post('/find')
def find_lenders(lead: LeadInput, lead_id: Optional[int] = None, limit: Optional[int] = None, db: Session = Depends(get_db)):
    """Return lender suggestions based on `lenders_raw` rows and simple scoring.

    When no lead_id is provided and no limit is specified, the route returns all matched lenders.
    """
    # Load lenders_raw rows
    with engine.connect() as conn:
        try:
            res = conn.execute(text('SELECT * FROM lenders_raw'))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to read lenders_raw: {exc}")

        rows = [dict(r) for r in res.mappings().all()]

    scored = []
    for r in rows:
        score = 0
        reasons = []

        # ticket range
        min_ticket, max_ticket = parse_range(r.get('loan_amount_range'))
        if lead.loan_amount is not None and min_ticket is not None:
            if max_ticket is None or (min_ticket <= lead.loan_amount <= max_ticket):
                score += 30
                reasons.append('ticket_match')
            else:
                # closer distance penalized
                score -= 5

        # turnover
        min_turn = parse_money(r.get('minimum_turnover'))
        if lead.turnover is not None and min_turn is not None:
            if lead.turnover >= min_turn:
                score += 20
                reasons.append('turnover_ok')
            else:
                score -= 5

        # cibil
        try:
            min_cibil = int(r.get('minimum_cibil_credit_score')) if r.get('minimum_cibil_credit_score') else None
        except Exception:
            min_cibil = None
        if lead.cibil is not None and min_cibil is not None:
            if lead.cibil >= min_cibil:
                score += 15
                reasons.append('cibil_ok')
            else:
                score -= 5

        # industry
        if lead.industry and r.get('preferred_industry'):
            if matches_industry(r.get('preferred_industry'), lead.industry):
                score += 15
                reasons.append('industry_match')

        # product
        if lead.product and r.get('product_name'):
            if lead.product.lower() in str(r.get('product_name')).lower():
                score += 10
                reasons.append('product_match')

        # higher ROI/processing fee prefer lower processing fees
        # Not implemented complex parsing; small bonus if ROI specified
        if r.get('roi_interest_rate'):
            score += 2
        # processing fee: prefer lower percentage fees
        pf = parse_processing_fee(r.get('processing_fee'))
        if pf is not None:
            # smaller is better — give small bonus for low fees
            if pf <= 1:
                score += 5
                reasons.append('low_processing_fee')
            elif pf <= 2:
                score += 3
                reasons.append('low_processing_fee')
            elif pf <= 3:
                score += 1
            else:
                score -= 1
        # ROI: prefer lower rates
        roi_val = parse_roi(r.get('roi_interest_rate'))
        if roi_val is not None:
            try:
                # small bonus for lower rates
                if roi_val <= 10:
                    score += 4; reasons.append('low_roi')
                elif roi_val <= 15:
                    score += 2; reasons.append('low_roi')
                elif roi_val <= 20:
                    score += 1
                else:
                    score -= 1
            except Exception:
                pass

        scored.append({'lender': r, 'score': score, 'reasons': reasons})

    # Sort results by score
    scored_sorted = sorted(scored, key=lambda x: x['score'], reverse=True)

    # If lead_id provided, persist recommendations to LenderRecommendation
    if lead_id is not None:
        try:
            for entry in scored_sorted[:10]:
                lender_row = entry['lender']
                # Try to map lender id from normalized lenders table if present
                lender_obj = db.query(Lender).filter_by(name=lender_row.get('lender_name')).first()
                lender_id = lender_obj.id if lender_obj else None
                rec = LenderRecommendation(
                    lead_id=str(lead_id),
                    lender_id=lender_id,
                    score=entry['score'],
                    details=lender_row,
                )
                db.add(rec)
            db.commit()
        except Exception:
            db.rollback()

    results = scored_sorted if limit is None else scored_sorted[:limit]
    return {'count': len(results), 'results': results}



@router.post('/{lender_id}/proceed')
def proceed_with_lender(lender_id: int, lead_id: Optional[str] = None, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Record that the current user chose to proceed with a lender for a lead."""
    # validate lender exists
    lender = db.query(Lender).filter_by(id=lender_id).first()
    if not lender:
        raise HTTPException(status_code=404, detail='Lender not found')

    # attempt to fetch provider portal URL from lender.extra if present
    provider_portal = None
    try:
        lender_extra = lender.extra or {}
        if isinstance(lender_extra, dict):
            provider_portal = lender_extra.get('provider_portal')
    except Exception:
        provider_portal = None

    mapping = LeadLenderMapping(lead_id=lead_id or '', lender_id=lender_id, provider_portal=provider_portal, status='initiated', note=f'User {current_user.email} initiated')
    db.add(mapping)
    db.commit()
    return {'status': 'ok', 'mapping_id': mapping.id, 'provider_portal': provider_portal}



@router.get('/recommendations')
def get_recommendations(lead_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Return persisted recommendations for a lead (if any)."""
    if not lead_id:
        raise HTTPException(status_code=400, detail='lead_id query parameter is required')
    try:
        recs = db.query(LenderRecommendation).filter_by(lead_id=str(lead_id)).order_by(LenderRecommendation.score.desc()).all()
        out = []
        for r in recs:
            lender = db.query(Lender).filter_by(id=r.lender_id).first() if r.lender_id else None
            out.append({'recommendation': r, 'lender': lender})
        return {'count': len(out), 'results': out}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
