from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.core.security import create_access_token
from app.schemas.v2.auth import (
    SignupRequest,
    SignupResponse,
    LoginRequest,
    LoginResponse,
)
from app.services.v2.auth import create_user, authenticate_user

router = APIRouter()


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    try:
        user = create_user(db=db, username=req.username, password=req.password)
        token = create_access_token({"sub": str(user.id), "username": user.username})
        return SignupResponse(id=user.id, username=user.username, access_token=token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db=db, username=req.username, password=req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    token = create_access_token({"sub": str(user.id), "username": user.username})

    return LoginResponse(id=user.id, username=user.username, access_token=token)
