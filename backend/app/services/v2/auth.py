from typing import Optional

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.v2.models import User


def create_user(db: Session, username: str, password: str) -> User:
    """Create a new user with a salted password hash."""
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise ValueError("Username already exists.")

    password_hash = hash_password(password)
    user = User(username=username, password_hash=password_hash)
    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except SQLAlchemyError as exc:
        db.rollback()
        raise RuntimeError(f"Failed to create user: {exc}") from exc

    return user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Return a user if the credentials are valid."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user
