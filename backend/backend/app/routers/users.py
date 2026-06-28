from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..dependencies import get_db
from ..auth.dependencies import get_current_user, require_admin, require_manager_or_admin
from ..schemas.user import UserCreate, UserResponse, UserUpdate, UserRole
from ..services.user_service import (
    assert_user_exists,
    create_user,
    delete_user,
    get_user_by_email,
    get_user_by_id,
    get_users,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[UserResponse]:
    if current_user.role == UserRole.employee.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees may only view their own profile.",
        )
    return get_users(db)


@router.get("/{user_id}", response_model=UserResponse)
def read_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserResponse:
    user = assert_user_exists(get_user_by_id(db, user_id))
    if current_user.role == UserRole.employee.value and current_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees may only view their own profile.",
        )
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    user_create: UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserResponse:
    if current_user.role == UserRole.employee.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees may not create users.",
        )
    if current_user.role == UserRole.manager.value and user_create.role != UserRole.employee:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only create employee users.",
        )
    return create_user(db, user_create)


@router.put("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: UUID,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> UserResponse:
    user = assert_user_exists(get_user_by_id(db, user_id))
    if current_user.role == UserRole.employee.value and current_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employees may only update their own profile.",
        )
    if current_user.role == UserRole.manager.value and user.role != UserRole.employee.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers may only update employee profiles.",
        )
    if user_update.role is not None and current_user.role != UserRole.admin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update roles.",
        )
    return update_user(db, user, user_update)


@router.get("/available/for-assignment", response_model=list[UserResponse])
def list_users_for_assignment(
    email: str | None = Query(None, description="Optional assignee email to filter assignment candidates."),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[UserResponse]:
    """Get list of users for task assignment - accessible to all authenticated users."""
    if email:
        user = get_user_by_email(db, email)
        return [user] if user else []
    return get_users(db)


@router.delete("/{user_id}")
def delete_user_endpoint(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
) -> dict[str, str]:
    user = assert_user_exists(get_user_by_id(db, user_id))
    delete_user(db, user)
    return {"detail": "User deleted successfully."}
