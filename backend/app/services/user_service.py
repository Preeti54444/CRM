from datetime import datetime
from typing import Iterable
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate
from ..utils.security import hash_password, verify_password


def get_user_by_id(db: Session, user_id: UUID | str) -> User | None:
    if isinstance(user_id, str):
        try:
            user_id = UUID(user_id)
        except ValueError:
            return None
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized_email = email.lower().strip()
    return db.query(User).filter(func.lower(User.email) == normalized_email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100) -> list[User]:
    return db.query(User).offset(skip).limit(limit).all()


def create_user(db: Session, user_create: UserCreate) -> User:
    existing_user = get_user_by_email(db, user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    hashed_password = hash_password(user_create.password)
    new_user = User(
        id=uuid4(),
        full_name=user_create.full_name,
        email=user_create.email.lower().strip(),
        mobile=user_create.mobile,
        password_hash=hashed_password,
        role=user_create.role.value,
        department=user_create.department,
        status=user_create.status.value,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create user. Email may already be in use.",
        ) from exc
    return new_user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def update_user(db: Session, user: User, user_update: UserUpdate) -> User:
    if user_update.email and user_update.email.lower().strip() != user.email:
        if get_user_by_email(db, user_update.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists.",
            )
        user.email = user_update.email.lower().strip()

    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.mobile is not None:
        user.mobile = user_update.mobile
    if user_update.department is not None:
        user.department = user_update.department
    if user_update.role is not None:
        user.role = user_update.role.value
    if user_update.status is not None:
        user.status = user_update.status.value
    if user_update.password is not None:
        user.password_hash = hash_password(user_update.password)

    user.updated_at = datetime.utcnow()
    db.add(user)
    try:
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update user.",
        ) from exc
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()


def assert_user_exists(user: User | None) -> User:
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user
