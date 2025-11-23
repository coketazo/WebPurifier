import numpy as np
from sqlalchemy.orm import Session
from typing import List, Sequence, Tuple

from app.services.v2.embedding import sbert_model  # 로드된 SBERT 모델
from app.services.v2.category_cache import (
    CategoryVectorMeta,
    get_cached_category_vectors,
    set_cached_category_vectors,
)
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
    SBERT로 텍스트를 임베딩한 뒤, 사용자 카테고리 벡터와의 코사인 유사도를
    NumPy 연산으로 계산해 필터 여부를 판단한다.
    한 요청에서 사용자 카테고리를 한 번만 읽고, 메모리 내에서 일괄 계산해
    DB 왕복과 pgvector 함수 호출 횟수를 크게 줄인다.
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
        raw_vectors = sbert_model.encode(texts_to_encode)
    except Exception as exc:
        raise RuntimeError(f"SBERT 인코딩 실패: {exc}") from exc

    vector_list = _normalize_input_vectors(raw_vectors)

    # --- 2. 사용자 카테고리 벡터 선로드 ---
    cached = get_cached_category_vectors(user_id)
    if cached is not None:
        category_vectors, category_meta = cached
    else:
        category_vectors, category_meta = _load_user_category_vectors(db, user_id)
        if category_vectors is None or category_meta is None:
            # 카테고리가 없으면 모두 통과
            return FilterResponse(
                results=[
                    FilterResult(
                        text=text,
                        should_filter=False,
                        matched_categories=[],
                    )
                    for text in texts
                ]
            )
        set_cached_category_vectors(user_id, category_vectors, category_meta)

    # --- 3. 벡터 연산으로 결과 생성 ---
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
            normalized_vector = next(vector_iter)
        except StopIteration as exc:
            raise RuntimeError(
                "인코딩된 벡터 수가 요청 수와 일치하지 않습니다."
            ) from exc

        scores = _compute_cosine_scores(category_vectors, normalized_vector)
        matched = _build_matches(category_meta, scores, threshold)

        results.append(
            FilterResult(
                text=text,
                should_filter=bool(matched),
                matched_categories=matched,
            )
        )

    # vector_list 개수 검증
    try:
        next(vector_iter)
    except StopIteration:
        pass
    else:
        raise RuntimeError("인코딩된 벡터 수가 요청 수보다 많습니다.")

    return FilterResponse(results=results)


def _normalize_input_vectors(
    raw_vectors: np.ndarray | List[np.ndarray],
) -> List[np.ndarray]:
    """SBERT 결과를 2차원 리스트로 변환하고 각 벡터를 정규화한다."""

    def _to_array(vec: np.ndarray | List[float]) -> np.ndarray:
        return np.asarray(vec, dtype=np.float32)

    vectors: List[np.ndarray]
    if isinstance(raw_vectors, np.ndarray):
        if raw_vectors.ndim == 1:
            vectors = [raw_vectors]
        else:
            vectors = [row for row in raw_vectors]
    else:
        vectors = [_to_array(vec) for vec in raw_vectors]  # type: ignore[arg-type]

    normalized: List[np.ndarray] = []
    for vec in vectors:
        norm = np.linalg.norm(vec)
        if norm == 0:
            normalized.append(vec)
        else:
            normalized.append(vec / norm)
    return normalized


def _load_user_category_vectors(
    db: Session, user_id: int
) -> Tuple[np.ndarray | None, List[CategoryVectorMeta] | None]:
    """사용자 카테고리를 한 번에 불러와 정규화된 행렬로 반환한다."""

    categories: List[Category] = (
        db.query(Category)
        .filter(Category.user_id == user_id, Category.embedding.is_not(None))
        .all()
    )

    if not categories:
        return None, None

    vectors: List[np.ndarray] = []
    kept_meta: List[CategoryVectorMeta] = []

    for category in categories:
        if category.embedding is None:
            continue
        vec = np.asarray(category.embedding, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm == 0:
            continue
        vectors.append(vec / norm)
        kept_meta.append(
            CategoryVectorMeta(
                id=category.id,
                name=category.name,
            )
        )

    if not vectors:
        return None, None

    return np.stack(vectors), kept_meta


def _compute_cosine_scores(
    category_matrix: np.ndarray, target: np.ndarray
) -> np.ndarray:
    """정규화된 카테고리 행렬과 대상 벡터의 코사인 유사도 스코어를 계산한다."""

    if target.ndim != 1:
        target = target.ravel()

    if np.linalg.norm(target) == 0:
        return np.zeros(category_matrix.shape[0], dtype=np.float32)

    return category_matrix @ target


def _build_matches(
    categories: List[CategoryVectorMeta],
    scores: np.ndarray,
    threshold: float,
) -> List[MatchedCategoryInfo]:
    """임계값 이상인 카테고리만 추려 정렬된 매칭 결과를 만든다."""

    matched: List[MatchedCategoryInfo] = []
    for category, score in zip(categories, scores):
        similarity_score = float(score)
        if similarity_score < threshold:
            continue
        matched.append(
            MatchedCategoryInfo(
                id=category.id,
                name=category.name,
                similarity=similarity_score,
            )
        )

    matched.sort(key=lambda item: item.similarity, reverse=True)
    return matched
