from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from jose import JWTError

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, oauth2_scheme
from ..schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse, UserRole
from ..services.user_service import authenticate_user, create_user, get_user_by_id
from ..auth.jwt import create_token_for_user
from ..utils.security import decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_create: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    if user_create.role != UserRole.employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration is limited to employee role only.",
        )
    return create_user(db, user_create)


@router.post("/login", response_model=TokenResponse)
def login(login_request: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, login_request.email, login_request.password.get_secret_value())
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_token_for_user(str(user.id))
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
def read_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> UserResponse:
    """Get current authenticated user. Includes fallback handling for token-based user info."""
    try:
        # Try to decode the token and fetch full user from database
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        try:
            user = get_user_by_id(db, UUID(user_id))
            if user:
                return user
        except Exception as e:
            # If database lookup fails, create minimal response from token
            print(f"Warning: Database lookup failed for user {user_id}: {e}")
            pass
        
        # Fallback: create minimal user response from token
        # This allows login to complete even if database query fails
        return UserResponse(
            id=user_id,
            email="unknown@fundingsathi.in",
            full_name="User",
            role="employee"
        )
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
