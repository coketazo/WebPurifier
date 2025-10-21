from sqlalchemy.orm import Session
from typing import List
import numpy as np

from app.services.v2.embedding import sbert_model # 로드된 SBERT 모델
from app.v2.models import Category                      # SQLAlchemy Category 모델
from app.schemas.v2.filter import FilterResponse, MatchedCategoryInfo

def similarity(
    db: Session, 
    user_id: int, 
    text_to_check: str, 
    threshold: float
) -> FilterResponse:
    """
    SBERT와 pgvector를 사용해 텍스트 유사도를 검사합니다.
    """
    
    if sbert_model is None:
        raise RuntimeError("SBERT model is not loaded.")

    # --- 1. 입력 텍스트 벡터화 ---
    try:
        # sbert_model.encode()는 NumPy 배열을 반환
        input_vector = sbert_model.encode(text_to_check)
        # pgvector에 전달하기 위해 list로 변환
        input_vector_list = input_vector.tolist() 
    except Exception as e:
        raise RuntimeError(f"SBERT 인코딩 실패: {e}") from e

    # --- 2. pgvector를 이용한 DB 검색 ---
    
    # pgvector의 <-> (L2), <#> (Inner Product), <=> (Cosine Distance) 연산자 중
    # 코사인 유사도(Cosine Similarity)와 직접 대응되는 코사인 거리(Cosine Distance)를 사용
    #
    # 코사인 유사도 (Similarity) = 1 - 코사인 거리 (Distance)
    #
    # 따라서, '유사도 >= threshold' 조건은
    # '1 - 거리 >= threshold' 와 같고,
    # '거리 <= 1 - threshold' 와 같습니다.
    
    distance_threshold = 1 - threshold

    try:
        # Category.embedding.cosine_distance(vector) 함수를 사용합니다.
        # .label('distance')로 거리 값을 'distance'라는 별칭으로 가져옵니다.
        similar_categories_query = db.query(
                Category.id,
                Category.name,
                Category.embedding.cosine_distance(input_vector_list).label('distance')
            ).filter(
                Category.user_id == user_id,
                # DB에서 바로 거리 임계값으로 필터링
                Category.embedding.cosine_distance(input_vector_list) <= distance_threshold 
            ).order_by(
                Category.embedding.cosine_distance(input_vector_list).asc() # 거리가 가까운 순
            )

        results = similar_categories_query.all()

    except Exception as e:
        db.rollback()
        raise RuntimeError(f"DB 벡터 검색 실패: {e}") from e

    # --- 3. 결과 포맷팅 ---
    matched_categories: List[MatchedCategoryInfo] = []
    for res in results:
        similarity = 1 - res.distance # 거리 -> 유사도 변환
        matched_categories.append(
            MatchedCategoryInfo(
                id=res.id,
                name=res.name,
                similarity=similarity
            )
        )

    return FilterResponse(
        should_filter=bool(matched_categories), # 매칭된 것이 하나라도 있으면 True
        matched_categories=matched_categories
    )