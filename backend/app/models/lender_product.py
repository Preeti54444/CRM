from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..database import Base


class LenderProduct(Base):
    __tablename__ = "lender_products"

    id = Column(Integer, primary_key=True, index=True)
    lender_name = Column(String(255), nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    loan_amount_range = Column(String(255), nullable=True)
    roi_interest_rate = Column(String(255), nullable=True)
    tenure = Column(String(255), nullable=True)
    minimum_turnover = Column(String(255), nullable=True)
    business_vintage = Column(String(255), nullable=True)
    processing_fee = Column(String(255), nullable=True)
    key_features = Column(Text, nullable=True)
    key_eligibility_criteria = Column(Text, nullable=True)
    product_category = Column(String(255), nullable=True)
    sub_product = Column(String(255), nullable=True)
    locations_working_in = Column(String(255), nullable=True)
    preferred_industry = Column(Text, nullable=True)
    negative_industries = Column(Text, nullable=True)
    minimum_cibil_credit_score = Column(String(255), nullable=True)
    minimum_credit_rating_grade = Column(String(255), nullable=True)
    primary_security_collateral = Column(Text, nullable=True)
    guarantee_requirement = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<LenderProduct(id={self.id}, lender_name='{self.lender_name}', product_name='{self.product_name}')>"
