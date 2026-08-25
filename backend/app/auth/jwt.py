from datetime import timedelta
from typing import Any

from ..config import settings
from ..utils.security import create_access_token, decode_access_token


def create_token_for_user(user_id: str) -> str:
    return create_access_token(subject=user_id, expires_delta=timedelta(minutes=settings.access_token_expire_minutes))


def decode_token(token: str) -> dict[str, Any]:
    return decode_access_token(token)
