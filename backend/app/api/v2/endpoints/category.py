from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.v2.category import (
    CategoryCreateRequest,
    CategoryDeleteResponse,
    CategoryResponse,
)
from app.services.v2.category import (
    create_category,
    delete_category as delete_category_service,
    list_user_categories,
)
from app.db import get_db  # DB 세션 주입용
from app.api.dependencies.auth import get_current_user
from app.v2.models import User

router = APIRouter()


@router.post("/", response_model=CategoryResponse, status_code=201)
def category(
    req: CategoryCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        new_category = create_category(
            db=db,
            user_id=user.id,
            name=req.name,
            keywords=req.keywords,
            description=req.description,
        )
        return new_category
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # todo: 로깅 추가
        raise HTTPException(status_code=500, detail="카테고리 생성 중 서버 오류 발생")


@router.get("/", response_model=list[CategoryResponse])
def get_categories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        categories = list_user_categories(db=db, user_id=user.id)
        return categories
    except Exception:
        # todo: 로깅 추가
        raise HTTPException(status_code=500, detail="카테고리 조회 중 서버 오류 발생")


@router.delete("/{category_id}", response_model=CategoryDeleteResponse)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        deleted_id = delete_category_service(
            db=db, user_id=user.id, category_id=category_id
        )
        return CategoryDeleteResponse(id=deleted_id, message="카테고리를 삭제했습니다.")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="카테고리 삭제 중 서버 오류 발생")
