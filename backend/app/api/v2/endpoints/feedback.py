from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.v2.feedback import FeedbackRequest, FeedbackResponse
from app.services.v2.feedback import process_feedback
from app.db import get_db # DB 세션
from app.api.dependencies.auth import get_current_user
from app.v2.models import User

router = APIRouter()

@router.post("/", response_model=FeedbackResponse, status_code=201) # 생성(Created)
def handle_feedback(
    req: FeedbackRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    v2: 텍스트 필터링 결과에 대한 사용자 피드백을 처리합니다.
    - "reinforce": 카테고리 벡터를 해당 텍스트와 가깝게 조정합니다.
    - "weaken": 카테고리 벡터를 해당 텍스트와 멀게 조정합니다.
    """
    try:
        response = process_feedback(db=db, user_id=user.id, req=req)
        return response
    except HTTPException as e:
        # (404) 서비스 로직에서 발생한 HTTPException (예: category not found)
        raise e
    except RuntimeError as e:
        # (500) SBERT 인코딩 실패, DB 업데이트 실패 등
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        # (500) 기타 예상치 못한 오류
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
