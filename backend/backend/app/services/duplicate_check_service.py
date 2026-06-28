"""
Lead Duplication Detection Service

Implements hard and soft duplicate detection logic:
- Hard duplicates: Block creation if exact match found
- Soft duplicates: Warn if fuzzy match found (company similarity > 90%)
"""

from typing import Optional, Dict, Any
from difflib import SequenceMatcher
from uuid import UUID
from sqlalchemy.orm import Session

from ..models.lead import Lead
from ..models.lead_duplicate_log import LeadDuplicateLog


class DuplicateCheckResult:
    """Result of a duplicate check operation."""
    
    def __init__(
        self,
        is_duplicate: bool,
        duplicate_type: Optional[str] = None,
        message: Optional[str] = None,
        existing_lead: Optional[Dict[str, Any]] = None,
    ):
        self.is_duplicate = is_duplicate
        self.duplicate_type = duplicate_type  # hard_duplicate or potential_duplicate
        self.message = message
        self.existing_lead = existing_lead or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "duplicate": self.is_duplicate,
            "type": self.duplicate_type,
            "message": self.message,
            "existing_lead": self.existing_lead,
        }


class DuplicateCheckService:
    """Service for detecting and managing lead duplicates."""
    
    # Fuzzy matching threshold (0-100)
    COMPANY_SIMILARITY_THRESHOLD = 70
    
    @staticmethod
    def _normalize_string(text: Optional[str]) -> str:
        """Normalize string for comparison."""
        if not text:
            return ""
        return str(text).strip().lower()
    
    @staticmethod
    def _format_existing_lead(lead: Lead) -> Dict[str, Any]:
        """Format lead data for response."""
        return {
            "id": lead.id,
            "lead_name": lead.lead_name,
            "company_name": lead.company_name,
            "assigned_to": str(lead.assigned_to) if lead.assigned_to else None,
            "lead_status": lead.lead_status,
            "created_at": lead.created_at.isoformat() if lead.created_at else None,
        }
    
    @staticmethod
    def _similarity_ratio(str1: str, str2: str) -> float:
        """Calculate similarity ratio between two strings (0-100)."""
        if not str1 or not str2:
            return 0.0
        return SequenceMatcher(None, str1, str2).ratio() * 100
    
    @staticmethod
    def check_mobile_duplicate(db: Session, mobile: Optional[str], exclude_lead_id: Optional[int] = None) -> Optional[Lead]:
        """Check if a mobile number already exists."""
        if not mobile:
            return None
        
        mobile_normalized = DuplicateCheckService._normalize_string(mobile)
        query = db.query(Lead).filter(Lead.mobile == mobile_normalized)
        
        if exclude_lead_id:
            query = query.filter(Lead.id != exclude_lead_id)
        
        return query.first()
    
    @staticmethod
    def check_alternate_mobile_duplicate(db: Session, alternate_mobile: Optional[str], exclude_lead_id: Optional[int] = None) -> Optional[Lead]:
        """Check if an alternate mobile number already exists."""
        if not alternate_mobile:
            return None
        
        alt_mobile_normalized = DuplicateCheckService._normalize_string(alternate_mobile)
        query = db.query(Lead).filter(Lead.alternate_mobile == alt_mobile_normalized)
        
        if exclude_lead_id:
            query = query.filter(Lead.id != exclude_lead_id)
        
        return query.first()
    
    @staticmethod
    def check_email_duplicate(db: Session, email: Optional[str], exclude_lead_id: Optional[int] = None) -> Optional[Lead]:
        """Check if an email already exists."""
        if not email:
            return None
        
        email_normalized = DuplicateCheckService._normalize_string(email)
        query = db.query(Lead).filter(Lead.email == email_normalized)
        
        if exclude_lead_id:
            query = query.filter(Lead.id != exclude_lead_id)
        
        return query.first()
    
    @staticmethod
    def check_company_email_duplicate(db: Session, company_email: Optional[str], exclude_lead_id: Optional[int] = None) -> Optional[Lead]:
        """Check if a company email already exists."""
        if not company_email:
            return None
        
        company_email_normalized = DuplicateCheckService._normalize_string(company_email)
        query = db.query(Lead).filter(Lead.company_email == company_email_normalized)
        
        if exclude_lead_id:
            query = query.filter(Lead.id != exclude_lead_id)
        
        return query.first()
    
    @staticmethod
    def check_company_duplicate_fuzzy(db: Session, company_name: Optional[str], exclude_lead_id: Optional[int] = None) -> Optional[Lead]:
        """
        Check for similar company names using fuzzy matching.
        Returns the most similar company if similarity > threshold.
        """
        if not company_name:
            return None
        
        company_normalized = DuplicateCheckService._normalize_string(company_name)
        
        # Get all companies (in production, this could be optimized with a trie or similar structure)
        query = db.query(Lead).filter(Lead.company_name.isnot(None))
        
        if exclude_lead_id:
            query = query.filter(Lead.id != exclude_lead_id)
        
        leads = query.all()
        
        best_match = None
        best_similarity = 0.0
        
        for lead in leads:
            if lead.company_name:
                lead_company_normalized = DuplicateCheckService._normalize_string(lead.company_name)
                similarity = DuplicateCheckService._similarity_ratio(
                    company_normalized,
                    lead_company_normalized
                )
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = lead
        
        if best_similarity >= DuplicateCheckService.COMPANY_SIMILARITY_THRESHOLD:
            return best_match
        
        return None
    
    @staticmethod
    def check_lead_name_company_duplicate(db: Session, lead_name: str, company_name: Optional[str], exclude_lead_id: Optional[int] = None) -> Optional[Lead]:
        """Check if lead_name + company_name combination already exists."""
        if not lead_name:
            return None
        
        lead_name_normalized = DuplicateCheckService._normalize_string(lead_name)
        company_normalized = DuplicateCheckService._normalize_string(company_name) if company_name else None
        
        from sqlalchemy import func
        query = db.query(Lead).filter(
            func.lower(Lead.lead_name) == lead_name_normalized
        )
        
        if company_normalized:
            query = query.filter(func.lower(Lead.company_name) == company_normalized)
        
        if exclude_lead_id:
            query = query.filter(Lead.id != exclude_lead_id)
        
        return query.first()
    
    @staticmethod
    def check_all_duplicates(
        db: Session,
        lead_name: str,
        mobile: Optional[str] = None,
        alternate_mobile: Optional[str] = None,
        email: Optional[str] = None,
        company_email: Optional[str] = None,
        company_name: Optional[str] = None,
        exclude_lead_id: Optional[int] = None,
    ) -> Optional[DuplicateCheckResult]:
        """
        Check for all types of duplicates.
        Returns first match found in order: hard duplicates, then soft duplicates.
        """
        
        # LEVEL 1: Hard Duplicates (exact matches block creation)
        hard_duplicate_checks = [
            ("mobile", DuplicateCheckService.check_mobile_duplicate(db, mobile, exclude_lead_id)),
            ("alternate_mobile", DuplicateCheckService.check_alternate_mobile_duplicate(db, alternate_mobile, exclude_lead_id)),
            ("email", DuplicateCheckService.check_email_duplicate(db, email, exclude_lead_id)),
            ("company_email", DuplicateCheckService.check_company_email_duplicate(db, company_email, exclude_lead_id)),
        ]
        
        for field_name, existing_lead in hard_duplicate_checks:
            if existing_lead:
                return DuplicateCheckResult(
                    is_duplicate=True,
                    duplicate_type="hard_duplicate",
                    message=f"Lead with this {field_name} already exists",
                    existing_lead=DuplicateCheckService._format_existing_lead(existing_lead),
                )
        
        # LEVEL 3: Lead Name + Company Match (block immediately)
        lead_name_company_match = DuplicateCheckService.check_lead_name_company_duplicate(
            db, lead_name, company_name, exclude_lead_id
        )
        if lead_name_company_match:
            return DuplicateCheckResult(
                is_duplicate=True,
                duplicate_type="hard_duplicate",
                message="Lead with same name and company already exists",
                existing_lead=DuplicateCheckService._format_existing_lead(lead_name_company_match),
            )
        
        # LEVEL 2: Company Duplicate (fuzzy matching - soft warning)
        company_fuzzy_match = DuplicateCheckService.check_company_duplicate_fuzzy(
            db, company_name, exclude_lead_id
        )
        if company_fuzzy_match:
            return DuplicateCheckResult(
                is_duplicate=True,
                duplicate_type="potential_duplicate",
                message="Similar company already exists",
                existing_lead=DuplicateCheckService._format_existing_lead(company_fuzzy_match),
            )
        
        return None
    
    @staticmethod
    def log_duplicate_attempt(
        db: Session,
        new_lead_data: Dict[str, Any],
        existing_lead_id: int,
        duplicate_type: str,
        created_by: Optional[UUID] = None,
    ) -> LeadDuplicateLog:
        """Log a duplicate lead attempt for audit purposes."""
        log_entry = LeadDuplicateLog(
            new_lead_data=new_lead_data,
            existing_lead_id=existing_lead_id,
            duplicate_type=duplicate_type,
            created_by=created_by,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
