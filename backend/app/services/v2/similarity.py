import numpy as np
from sqlalchemy.orm import Session
from typing import List, Sequence

from app.services.v2.embedding import sbert_model  # 로드된 SBERT 모델
from app.v2.models import Category  # SQLAlchemy Category 모델
from app.schemas.v2.filter import (
    FilterResponse,
    FilterResult,
    MatchedCategoryInfo,
)

def similarity(
    db: Session,
    user_id: int,
    texts_to_check: Sequence[str],
    threshold: float,
) -> FilterResponse:
    """
    SBERT와 pgvector를 사용해 텍스트 유사도를 검사합니다.
    """
    
    if sbert_model is None:
        raise RuntimeError("SBERT model is not loaded.")

    texts: List[str] = list(texts_to_check)
    if not texts:
        return FilterResponse(results=[])
    texts_to_encode: List[str] = [text for text in texts if text]
    if not texts_to_encode:
        return FilterResponse(
            results=[
                FilterResult(
                    text=text or "",
                    should_filter=False,
                    matched_categories=[],
                )
                for text in texts
            ]
        )

    # --- 1. 입력 텍스트 벡터화 ---
    try:
        # sbert_model.encode()는 NumPy 배열을 반환
        raw_vectors = sbert_model.encode(texts_to_encode)
    except Exception as e:
        raise RuntimeError(f"SBERT 인코딩 실패: {e}") from e

    # encode가 단일 입력일 때 1차원 배열을 반환할 수 있으므로 강제로 2차원 리스트로 변환
    if isinstance(raw_vectors, np.ndarray):
        if raw_vectors.ndim == 1:
            vector_list: List[List[float]] = [raw_vectors.tolist()]
        else:
            vector_list = raw_vectors.tolist()
    else:
        vector_list = [np.asarray(vec).tolist() for vec in raw_vectors]

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

    results: List[FilterResult] = []

    vector_iter = iter(vector_list)

    for text in texts:
        if not text:
            results.append(
                FilterResult(
                    text=text or "",
                    should_filter=False,
                    matched_categories=[],
                )
            )
            continue
        try:
            input_vector_list = next(vector_iter)
        except StopIteration as exc:
            raise RuntimeError("인코딩된 벡터 수가 요청 수와 일치하지 않습니다.") from exc
        try:
            # Category.embedding.cosine_distance(vector) 함수를 사용합니다.
            # .label('distance')로 거리 값을 'distance'라는 별칭으로 가져옵니다.
            similar_categories_query = (
                db.query(
                    Category.id,
                    Category.name,
                    Category.embedding.cosine_distance(input_vector_list).label(
                        "distance"
                    ),
                )
                .filter(
                    Category.user_id == user_id,
                    # DB에서 바로 거리 임계값으로 필터링
                    Category.embedding.cosine_distance(input_vector_list)
                    <= distance_threshold,
                )
                .order_by(
                    Category.embedding.cosine_distance(input_vector_list).asc()
                )  # 거리가 가까운 순
            )

            query_results = similar_categories_query.all()

        except Exception as e:
            db.rollback()
            raise RuntimeError(f"DB 벡터 검색 실패: {e}") from e

        # --- 3. 결과 포맷팅 ---
        matched_categories: List[MatchedCategoryInfo] = []
        for category in query_results:
            similarity_score = 1 - category.distance  # 거리 -> 유사도 변환
            matched_categories.append(
                MatchedCategoryInfo(
                    id=category.id,
                    name=category.name,
                    similarity=similarity_score,
                )
            )

        results.append(
            FilterResult(
                text=text,
                should_filter=bool(matched_categories),
                matched_categories=matched_categories,
            )
        )

    # 벡터가 남아 있다면 매핑 과정에 문제가 있는 것
    try:
        next(vector_iter)
    except StopIteration:
        pass
    else:
        raise RuntimeError("인코딩된 벡터 수가 요청 수보다 많습니다.")

    return FilterResponse(results=results)
