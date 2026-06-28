from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user
from ..schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse, UserRole
from ..services.user_service import authenticate_user, create_user
from ..auth.jwt import create_token_for_user

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
    return TokenResponse(access_token=access_token, user=user)


@router.get("/me", response_model=UserResponse)
def read_current_user(current_user=Depends(get_current_user)) -> UserResponse:
    return current_user
