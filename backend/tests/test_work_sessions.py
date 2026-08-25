import pytest
from datetime import datetime
from uuid import uuid4

from app.schemas.timer import WorkSessionResponse


class DummyWorkSession:
    pass


def test_work_session_response_coerces_uuid_created_by_to_string():
    session = DummyWorkSession()
    session.id = 1
    session.status = 'active'
    session.notes = None
    session.session_metadata = {}
    session.started_at = datetime.utcnow()
    session.ended_at = None
    session.duration_seconds = None
    session.created_by = uuid4()
    session.created_by_name = 'Test User'
    session.created_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()

    response = WorkSessionResponse.model_validate(session)

    assert isinstance(response.created_by, str)
    assert response.created_by == str(session.created_by)
