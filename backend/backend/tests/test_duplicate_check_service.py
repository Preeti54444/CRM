"""
Unit tests for lead duplication detection service
"""

import pytest
from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.lead_duplicate_log import LeadDuplicateLog
from app.schemas.lead import LeadCreate
from app.services.duplicate_check_service import DuplicateCheckService, DuplicateCheckResult
from app.services.lead_service import check_lead_duplicates, log_duplicate_attempt


class TestDuplicateCheckResult:
    """Test DuplicateCheckResult class"""
    
    def test_result_to_dict(self):
        """Test result conversion to dictionary"""
        result = DuplicateCheckResult(
            is_duplicate=True,
            duplicate_type="hard_duplicate",
            message="Test message",
            existing_lead={"id": 1, "lead_name": "Test"}
        )
        
        result_dict = result.to_dict()
        
        assert result_dict["duplicate"] == True
        assert result_dict["type"] == "hard_duplicate"
        assert result_dict["message"] == "Test message"
        assert result_dict["existing_lead"]["id"] == 1
    
    def test_result_not_duplicate(self):
        """Test result for unique lead"""
        result = DuplicateCheckResult(is_duplicate=False)
        
        assert result.is_duplicate == False
        assert result.duplicate_type is None


class TestStringNormalization:
    """Test string normalization for comparison"""
    
    def test_normalize_string(self):
        """Test string normalization"""
        assert DuplicateCheckService._normalize_string("  TEST  ") == "test"
        assert DuplicateCheckService._normalize_string("Test") == "test"
        assert DuplicateCheckService._normalize_string(None) == ""
        assert DuplicateCheckService._normalize_string("") == ""


class TestSimilarityRatio:
    """Test similarity ratio calculation"""
    
    def test_identical_strings(self):
        """Identical strings should have 100% similarity"""
        ratio = DuplicateCheckService._similarity_ratio("test", "test")
        assert ratio == 100.0
    
    def test_completely_different_strings(self):
        """Completely different strings should have ~0% similarity"""
        ratio = DuplicateCheckService._similarity_ratio("abc", "xyz")
        assert ratio < 10.0
    
    def test_similar_strings(self):
        """Similar strings should have high similarity"""
        # "Funding Sathi Pvt Ltd" vs "Funding Sathi Private Limited"
        ratio = DuplicateCheckService._similarity_ratio(
            "funding sathi pvt ltd",
            "funding sathi private limited"
        )
        assert ratio > 70.0  # Should be quite similar
    
    def test_empty_strings(self):
        """Empty strings should have 0% similarity"""
        ratio = DuplicateCheckService._similarity_ratio("", "test")
        assert ratio == 0.0


class TestMobileDuplicateCheck:
    """Test mobile number duplicate checking"""
    
    @pytest.fixture
    def setup_leads(self, db: Session):
        """Create test leads"""
        lead1 = Lead(
            lead_name="Test Lead 1",
            mobile="9876543210",
            lead_status="New"
        )
        db.add(lead1)
        db.commit()
        db.refresh(lead1)
        return lead1
    
    def test_mobile_duplicate_found(self, db: Session, setup_leads):
        """Test finding mobile duplicate"""
        existing = DuplicateCheckService.check_mobile_duplicate(db, "9876543210")
        assert existing is not None
        assert existing.lead_name == "Test Lead 1"
    
    def test_mobile_duplicate_not_found(self, db: Session):
        """Test mobile duplicate not found"""
        existing = DuplicateCheckService.check_mobile_duplicate(db, "1111111111")
        assert existing is None
    
    def test_mobile_exclude_lead(self, db: Session, setup_leads):
        """Test excluding a lead from duplicate check"""
        existing = DuplicateCheckService.check_mobile_duplicate(
            db, "9876543210", exclude_lead_id=setup_leads.id
        )
        assert existing is None


class TestEmailDuplicateCheck:
    """Test email duplicate checking"""
    
    @pytest.fixture
    def setup_leads(self, db: Session):
        """Create test leads"""
        lead1 = Lead(
            lead_name="Test Lead",
            email="test@example.com",
            lead_status="New"
        )
        db.add(lead1)
        db.commit()
        db.refresh(lead1)
        return lead1
    
    def test_email_duplicate_found(self, db: Session, setup_leads):
        """Test finding email duplicate"""
        existing = DuplicateCheckService.check_email_duplicate(db, "test@example.com")
        assert existing is not None
        assert existing.email == "test@example.com"
    
    def test_email_duplicate_normalized(self, db: Session, setup_leads):
        """Test email matching with different cases"""
        existing = DuplicateCheckService.check_email_duplicate(db, "TEST@EXAMPLE.COM")
        assert existing is not None  # Should match due to normalization


class TestCompanyFuzzyMatch:
    """Test company name fuzzy matching"""
    
    @pytest.fixture
    def setup_leads(self, db: Session):
        """Create test leads with companies"""
        companies = [
            "Funding Sathi Pvt Ltd",
            "ABC Industries",
            "XYZ Corp"
        ]
        leads = []
        for i, company in enumerate(companies):
            lead = Lead(
                lead_name=f"Lead {i}",
                company_name=company,
                lead_status="New"
            )
            db.add(lead)
            leads.append(lead)
        db.commit()
        return leads
    
    def test_fuzzy_match_above_threshold(self, db: Session, setup_leads):
        """Test fuzzy matching above threshold"""
        # "Funding Sathi Private Limited" should match "Funding Sathi Pvt Ltd"
        existing = DuplicateCheckService.check_company_duplicate_fuzzy(
            db, "Funding Sathi Private Limited"
        )
        assert existing is not None
        assert "Funding Sathi" in existing.company_name
    
    def test_fuzzy_match_below_threshold(self, db: Session, setup_leads):
        """Test fuzzy matching below threshold"""
        # Very different company should not match
        existing = DuplicateCheckService.check_company_duplicate_fuzzy(
            db, "Completely Different Corp"
        )
        assert existing is None


class TestLeadNameCompanyMatch:
    """Test lead name + company combination matching"""
    
    @pytest.fixture
    def setup_leads(self, db: Session):
        """Create test leads"""
        lead1 = Lead(
            lead_name="John Doe",
            company_name="ABC Corp",
            lead_status="New"
        )
        db.add(lead1)
        db.commit()
        db.refresh(lead1)
        return lead1
    
    def test_name_company_match_found(self, db: Session, setup_leads):
        """Test finding name + company match"""
        existing = DuplicateCheckService.check_lead_name_company_duplicate(
            db, "John Doe", "ABC Corp"
        )
        assert existing is not None
    
    def test_name_only_no_match(self, db: Session, setup_leads):
        """Test that only name doesn't cause match"""
        existing = DuplicateCheckService.check_lead_name_company_duplicate(
            db, "John Doe", "Different Corp"
        )
        assert existing is None


class TestCheckAllDuplicates:
    """Test comprehensive duplicate checking"""
    
    @pytest.fixture
    def setup_leads(self, db: Session):
        """Create test leads"""
        lead1 = Lead(
            lead_name="John Doe",
            company_name="Funding Sathi Pvt Ltd",
            mobile="9876543210",
            email="john@example.com",
            company_email="john@fundingsathi.com",
            lead_status="New"
        )
        db.add(lead1)
        db.commit()
        db.refresh(lead1)
        return lead1
    
    def test_hard_duplicate_mobile(self, db: Session, setup_leads):
        """Test hard duplicate detection by mobile"""
        result = DuplicateCheckService.check_all_duplicates(
            db,
            lead_name="Different Name",
            mobile="9876543210",  # Same mobile
            company_name="Different Company"
        )
        
        assert result is not None
        assert result.is_duplicate == True
        assert result.duplicate_type == "hard_duplicate"
    
    def test_hard_duplicate_email(self, db: Session, setup_leads):
        """Test hard duplicate detection by email"""
        result = DuplicateCheckService.check_all_duplicates(
            db,
            lead_name="Different Name",
            email="john@example.com",  # Same email
            company_name="Different Company"
        )
        
        assert result is not None
        assert result.duplicate_type == "hard_duplicate"
    
    def test_soft_duplicate_company(self, db: Session, setup_leads):
        """Test soft duplicate detection by company fuzzy match"""
        result = DuplicateCheckService.check_all_duplicates(
            db,
            lead_name="Jane Smith",
            mobile="1111111111",
            company_name="Funding Sathi Private Limited"  # Similar to Pvt Ltd
        )
        
        assert result is not None
        assert result.duplicate_type == "potential_duplicate"
    
    def test_no_duplicate(self, db: Session, setup_leads):
        """Test unique lead returns None"""
        result = DuplicateCheckService.check_all_duplicates(
            db,
            lead_name="Unique Lead",
            mobile="2222222222",
            email="unique@example.com",
            company_name="Unique Company"
        )
        
        assert result is None


class TestDuplicateLogging:
    """Test duplicate attempt logging"""
    
    @pytest.fixture
    def setup_lead(self, db: Session):
        """Create test lead"""
        lead = Lead(
            lead_name="Test Lead",
            mobile="9876543210",
            lead_status="New"
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return lead
    
    def test_log_duplicate_attempt(self, db: Session, setup_lead):
        """Test logging duplicate attempt"""
        log_data = {
            "lead_name": "New Lead",
            "mobile": "9876543210",
            "company_name": "ABC Corp"
        }
        
        log_entry = DuplicateCheckService.log_duplicate_attempt(
            db,
            log_data,
            setup_lead.id,
            "hard_duplicate",
            created_by=None
        )
        
        assert log_entry is not None
        assert log_entry.existing_lead_id == setup_lead.id
        assert log_entry.duplicate_type == "hard_duplicate"
        assert log_entry.new_lead_data["mobile"] == "9876543210"


class TestLeadServiceIntegration:
    """Test integration with lead_service"""
    
    @pytest.fixture
    def setup_lead(self, db: Session):
        """Create test lead"""
        lead = Lead(
            lead_name="Test Lead",
            mobile="9876543210",
            lead_status="New"
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return lead
    
    def test_check_lead_duplicates_service(self, db: Session, setup_lead):
        """Test check_lead_duplicates wrapper"""
        lead_data = LeadCreate(
            lead_name="New Lead",
            mobile="9876543210",
            company_name="ABC Corp"
        )
        
        result = check_lead_duplicates(db, lead_data)
        
        assert result is not None
        assert result.is_duplicate == True


# Run tests with:
# pytest backend/tests/test_duplicate_check_service.py -v
