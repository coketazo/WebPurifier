from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.v2.filter import FilterRequest, FilterResponse
from app.services.v2.similarity import similarity
from app.db import get_db # DB 세션
from app.api.dependencies.auth import get_current_user
from app.v2.models import User

router = APIRouter()

@router.post("/", response_model=FilterResponse)
def filter_v2(
    req: FilterRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    v2: SBERT와 벡터 DB를 사용하여 텍스트 필터링을 수행합니다.
    """
    try:
        response = similarity(
            db=db,
            user_id=user.id,
            text_to_check=req.text,
            threshold=req.threshold
        )
        return response
    except RuntimeError as e:
        # 서비스 로직에서 발생한 SBERT/DB 오류
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # 기타 예상치 못한 오류
        raise HTTPException(status_code=500, detail=f"필터링 중 서버 오류 발생: {e}")
