"""Target Configuration Service - Fixed targets for each employee"""
from typing import Dict, Optional
from uuid import UUID
from sqlalchemy.orm import Session


class TargetConfigurationService:
    """Service for managing fixed employee targets"""
    
    # Fixed target configurations as per business requirements
    EMPLOYEE_TARGETS = {
        "Vaibhav Borge": {
            "morning_calls": 25,
            "morning_leads": 2,
            "daily_calls": 35,
            "daily_leads": 3,
            "midweek_calls": 90,
            "midweek_leads": 9,
            "weekly_calls": 160,
            "weekly_leads": 15,
            "weekly_exploration_calls": 3
        },
        "Saleem Khan": {
            "morning_calls": 25,
            "morning_leads": 2,
            "daily_calls": 35,
            "daily_leads": 3,
            "midweek_calls": 90,
            "midweek_leads": 9,
            "weekly_calls": 160,
            "weekly_leads": 15,
            "weekly_exploration_calls": 3
        },
        "Roshan Chavan": {
            "morning_calls": 15,
            "morning_leads": 1,
            "daily_calls": 30,
            "daily_leads": 2,
            "midweek_calls": 75,
            "midweek_leads": 6,
            "weekly_calls": 120,
            "weekly_leads": 10,
            "weekly_exploration_calls": 1
        }
    }
    
    @classmethod
    def get_targets_by_employee_id(cls, db: Session, employee_id: UUID) -> Optional[Dict[str, int]]:
        """Get target configuration from database by employee ID"""
        try:
            from ..models.targets import Target
            target = db.query(Target).filter(Target.user_id == employee_id).first()
            if target:
                return {
                    "daily_calls": target.daily_call_target,
                    "daily_leads": target.daily_lead_target,
                    "weekly_calls": 0,
                    "weekly_leads": target.weekly_lead_target or 0,
                    "morning_calls": 0,
                    "morning_leads": 0,
                }
        except Exception:
            pass
        return None
    
    @classmethod
    def get_targets_by_name(cls, employee_name: str) -> Optional[Dict[str, int]]:
        """Get target configuration by employee name"""
        return cls.EMPLOYEE_TARGETS.get(employee_name)
    
    @classmethod
    def get_morning_targets(cls, employee_name: str, db: Optional[Session] = None, employee_id: Optional[UUID] = None) -> Dict[str, int]:
        """Get morning targets for an employee"""
        # Try to get from database first if employee_id provided
        if db and employee_id:
            db_targets = cls.get_targets_by_employee_id(db, employee_id)
            if db_targets:
                return {
                    "morning_calls": db_targets.get("morning_calls", 0),
                    "morning_leads": db_targets.get("morning_leads", 0)
                }
        
        # Fall back to hardcoded configuration
        targets = cls.EMPLOYEE_TARGETS.get(employee_name)
        if not targets:
            return {"morning_calls": 0, "morning_leads": 0}
        return {
            "morning_calls": targets["morning_calls"],
            "morning_leads": targets["morning_leads"]
        }
    
    @classmethod
    def get_daily_targets(cls, employee_name: str, db: Optional[Session] = None, employee_id: Optional[UUID] = None) -> Dict[str, int]:
        """Get daily targets for an employee"""
        # Try to get from database first if employee_id provided
        if db and employee_id:
            db_targets = cls.get_targets_by_employee_id(db, employee_id)
            if db_targets:
                return {
                    "daily_calls": db_targets.get("daily_calls", 0),
                    "daily_leads": db_targets.get("daily_leads", 0)
                }
        
        # Fall back to hardcoded configuration
        targets = cls.EMPLOYEE_TARGETS.get(employee_name)
        if not targets:
            return {"daily_calls": 0, "daily_leads": 0}
        return {
            "daily_calls": targets["daily_calls"],
            "daily_leads": targets["daily_leads"]
        }
    
    @classmethod
    def get_midweek_targets(cls, employee_name: str, db: Optional[Session] = None, employee_id: Optional[UUID] = None) -> Dict[str, int]:
        """Get mid-week targets (Monday-Wednesday) for an employee"""
        # Try to get from database first if employee_id provided
        if db and employee_id:
            db_targets = cls.get_targets_by_employee_id(db, employee_id)
            if db_targets:
                # For midweek, we can calculate from daily targets
                daily_calls = db_targets.get("daily_calls", 0)
                daily_leads = db_targets.get("daily_leads", 0)
                return {
                    "midweek_calls": daily_calls * 3,  # 3 days
                    "midweek_leads": daily_leads * 3,
                }
        
        # Fall back to hardcoded configuration
        targets = cls.EMPLOYEE_TARGETS.get(employee_name)
        if not targets:
            return {"midweek_calls": 0, "midweek_leads": 0}
        return {
            "midweek_calls": targets.get("midweek_calls", 0),
            "midweek_leads": targets.get("midweek_leads", 0),
        }

    @classmethod
    def get_weekly_targets(cls, employee_name: str, db: Optional[Session] = None, employee_id: Optional[UUID] = None) -> Dict[str, int]:
        """Get weekly targets for an employee"""
        # Try to get from database first if employee_id provided
        if db and employee_id:
            db_targets = cls.get_targets_by_employee_id(db, employee_id)
            if db_targets:
                return {
                    "weekly_calls": db_targets.get("weekly_calls", 0) or (db_targets.get("daily_calls", 0) * 5),
                    "weekly_leads": db_targets.get("weekly_leads", 0) or (db_targets.get("daily_leads", 0) * 5),
                    "weekly_exploration_calls": 0
                }
        
        # Fall back to hardcoded configuration
        targets = cls.EMPLOYEE_TARGETS.get(employee_name)
        if not targets:
            return {
                "weekly_calls": 0,
                "weekly_leads": 0,
                "weekly_exploration_calls": 0
            }
        return {
            "weekly_calls": targets["weekly_calls"],
            "weekly_leads": targets["weekly_leads"],
            "weekly_exploration_calls": targets["weekly_exploration_calls"]
        }
    
    @classmethod
    def get_all_employee_targets(cls) -> Dict[str, Dict[str, int]]:
        """Get all employee target configurations"""
        return cls.EMPLOYEE_TARGETS.copy()
    
    @classmethod
    def has_targets(cls, employee_name: str) -> bool:
        """Check if employee has configured targets"""
        return employee_name in cls.EMPLOYEE_TARGETS
    
    @classmethod
    def get_employee_names(cls) -> list:
        """Get list of all employee names with configured targets"""
        return list(cls.EMPLOYEE_TARGETS.keys())
