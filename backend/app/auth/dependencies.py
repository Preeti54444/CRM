from uuid import UUID
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..models.user import User
from ..utils.security import decode_access_token
from ..services.user_service import get_user_by_id
from ..schemas.user import UserRole


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


def raise_invalid_credentials(detail: str = "Could not validate credentials") -> None:
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def extract_token_from_request(request: Request) -> Optional[str]:
    """Extract token from Authorization header with multiple format support"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    
    # Handle "Bearer <token>" format
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    
    # Handle "Token <token>" format (alternative)
    if auth_header.startswith("Token "):
        return auth_header[6:].strip()
    
    # Handle raw token (not recommended but supported)
    return auth_header.strip()


async def get_current_user(
    request: Request,
    bearer_credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    # Try multiple token extraction methods
    auth_token = token
    
    if not auth_token and bearer_credentials:
        auth_token = bearer_credentials.credentials
    
    if not auth_token:
        auth_token = extract_token_from_request(request)
    
    if not auth_token:
        raise_invalid_credentials("Authorization token is missing")
    
    try:
        payload = decode_access_token(auth_token)
        user_id = payload.get("sub")
        if user_id is None:
            raise_invalid_credentials("Invalid token payload")
        
        try:
            user = get_user_by_id(db, UUID(user_id))
        except ValueError:
            raise_invalid_credentials("Invalid user ID in token")
    except JWTError as e:
        raise_invalid_credentials(f"Invalid token: {str(e)}")

    if user is None:
        raise_invalid_credentials("User not found")
    
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges are required.",
        )
    return current_user


def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin.value, UserRole.manager.value}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager or admin privileges are required.",
        )
    return current_user
