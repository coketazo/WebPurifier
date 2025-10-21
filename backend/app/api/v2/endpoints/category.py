from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.v2.category import CategoryCreateRequest, CategoryResponse
from app.services.v2.category import create_category
from app.db import get_db # DB 세션 주입용
from app.api.dependencies.auth import get_current_user
from app.v2.models import User

router = APIRouter()

@router.post("/", response_model=CategoryResponse, status_code=201)
def category(
    req: CategoryCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    try:
        new_category = create_category(
            db=db,
            user_id=user.id,
            name=req.name,
            keywords=req.keywords,
            description=req.description
        )
        return new_category
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # todo: 로깅 추가
        raise HTTPException(status_code=500, detail="카테고리 생성 중 서버 오류 발생")
