"""app.models package.

Legacy and new ORM models are defined in separate submodules.
This package intentionally avoids eager imports of model classes
that would register duplicate SQLAlchemy tables during package import.
"""

__all__ = [
    "user",
    "lead",
    "lead_duplicate_log",
    "meeting",
    "notification",
    "customer_profile",
    "followup",
    "timeline",
    "report",
    "activity_log",
    "call",
    "contact",
    "eod_report",
    "lender_case",
    "lender_query",
    "loan_application",
    "notification_event",
    "sod_report",
    "wod_report",
    "work_session",
    "early_logout_request",
    "targets",
]
