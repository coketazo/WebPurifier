import numpy as np
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.v2.models import Category, FeedbackLog
from app.services.v2.embedding import sbert_model
from app.services.v2.category_cache import invalidate_category_cache
from app.services.v2.vector import (
    deserialize_vector,
    normalize_vector,
    serialize_vector,
)
from app.schemas.v2.feedback import FeedbackRequest, FeedbackResponse

# 2. 벡터 조정 가중치 (학습률)
# 1.0에 가까울수록 새 피드백을 크게 반영 (0.05 = 5%)
LEARNING_RATE = 0.05


def process_feedback(
    db: Session, user_id: int, req: FeedbackRequest
) -> FeedbackResponse:

    if sbert_model is None:
        raise RuntimeError("SBERT model is not loaded.")

    # --- 1. 카테고리 조회 (DB에서) ---
    # 반드시 user_id와 category_id를 함께 조회하여 소유권 확인!
    category = (
        db.query(Category)
        .filter(Category.id == req.category_id, Category.user_id == user_id)
        .first()
    )

    if not category:
        # 내 카테고리가 아니거나 존재하지 않으면 404
        raise HTTPException(
            status_code=404, detail="Category not found or access denied."
        )

    # --- 2. 피드백 텍스트 벡터화 ---
    try:
        feedback_vector_raw = sbert_model.encode(req.text_content)
        feedback_vector = normalize_vector(feedback_vector_raw)
    except Exception as e:
        raise RuntimeError(f"SBERT encoding failed: {e}")

    # --- 3. 벡터 미세 조정 (핵심 로직) ---
    current_vector = deserialize_vector(category.embedding)

    if req.feedback_type == "reinforce":
        # "reinforce": 대표 벡터를 피드백 벡터 쪽으로 '가깝게' 이동
        # (1 - 0.05) * 현재벡터 + 0.05 * 피드백벡터
        new_vector = (
            1 - LEARNING_RATE
        ) * current_vector + LEARNING_RATE * feedback_vector

    elif req.feedback_type == "weaken":
        # "weaken": 대표 벡터를 피드백 벡터의 '반대' 방향으로 '멀게' 이동
        new_vector = current_vector - LEARNING_RATE * (feedback_vector - current_vector)

    # 정규화하여 저장 안정성 확보
    try:
        normalized_new_vector = normalize_vector(new_vector)
    except ValueError:
        normalized_new_vector = current_vector

    # --- 4. 피드백 로그 기록 (DB에) ---
    new_log = FeedbackLog(
        user_id=user_id,
        text_content=req.text_content,
        text_embedding=np.asarray(feedback_vector_raw, dtype=np.float32).tolist(),
        feedback_type=req.feedback_type,
        category_id=req.category_id,
    )
    db.add(new_log)

    # --- 5. 카테고리 대표 벡터 업데이트 (DB에) ---
    category.embedding = serialize_vector(normalized_new_vector)

    try:
        # 로그 저장과 카테고리 업데이트를 하나의 트랜잭션으로 처리
        db.commit()
        db.refresh(new_log)  # new_log.id 값을 가져오기 위해 refresh
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"Feedback DB update failed: {e}")
    else:
        invalidate_category_cache(user_id)

    # --- 6. 결과 반환 ---
    return FeedbackResponse(
        message="Feedback processed and category updated.",
        category_id=category.id,
        new_log_id=new_log.id,
    )
