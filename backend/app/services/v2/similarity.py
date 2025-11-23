import numpy as np
from sqlalchemy.orm import Session
from typing import List, Sequence, Tuple

from app.services.v2.embedding import sbert_model  # 로드된 SBERT 모델
from app.services.v2.embedding_cache import embedding_cache
from app.services.v2.category_cache import (
    CategoryVectorMeta,
    get_cached_category_vectors,
    set_cached_category_vectors,
)
from app.services.v2.vector import deserialize_vector
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
    vector_list = _get_cached_embeddings(texts_to_encode)

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

    # --- 3. 벡터 연산을 일괄 수행 ---
    target_matrix = np.stack(vector_list)  # shape: (텍스트 수, 임베딩 차원)
    score_matrix = _compute_batch_cosine_scores(category_vectors, target_matrix)

    vector_index_map: List[int | None] = []
    encode_idx = 0
    for text in texts:
        if text:
            vector_index_map.append(encode_idx)
            encode_idx += 1
        else:
            vector_index_map.append(None)

    results: List[FilterResult] = []
    for text, vector_idx in zip(texts, vector_index_map):
        if vector_idx is None:
            results.append(
                FilterResult(
                    text=text or "",
                    should_filter=False,
                    matched_categories=[],
                )
            )
            continue

        scores = score_matrix[vector_idx]
        matched = _build_matches(category_meta, scores, threshold)

        results.append(
            FilterResult(
                text=text,
                should_filter=bool(matched),
                matched_categories=matched,
            )
        )

    return FilterResponse(results=results)


def _get_cached_embeddings(texts: List[str]) -> List[np.ndarray]:
    """SBERT 임베딩을 캐시에서 조회하거나 필요한 부분만 새로 계산한다."""

    cached_entries: List[Tuple[int, np.ndarray]] = []
    missing_indices: List[int] = []
    missing_texts: List[str] = []

    for idx, text in enumerate(texts):
        cached = embedding_cache.get(text)
        if cached is not None:
            cached_entries.append((idx, cached))
        else:
            missing_indices.append(idx)
            missing_texts.append(text)

    vectors: List[np.ndarray | None] = [None] * len(texts)
    for idx, vec in cached_entries:
        vectors[idx] = vec

    if missing_texts:
        try:
            encoded = sbert_model.encode(missing_texts)
        except Exception as exc:
            raise RuntimeError(f"SBERT 인코딩 실패: {exc}") from exc

        encoded_list: List[np.ndarray]
        if isinstance(encoded, np.ndarray):
            if encoded.ndim == 1:
                encoded_list = [encoded]
            else:
                encoded_list = [row for row in encoded]
        else:
            encoded_list = [np.asarray(vec) for vec in encoded]  # type: ignore[arg-type]

        for position, vec in zip(missing_indices, encoded_list):
            arr = np.asarray(vec, dtype=np.float32)
            vectors[position] = arr
            embedding_cache.set(texts[position], arr)

    normalized: List[np.ndarray] = []
    for vec in vectors:
        if vec is None:
            raise RuntimeError("임베딩 캐시 구성 중 누락된 벡터가 발생했습니다.")
        norm = np.linalg.norm(vec)
        normalized.append(vec if norm == 0 else vec / norm)

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
        try:
            vec = deserialize_vector(category.embedding)
        except ValueError:
            continue
        vectors.append(vec)
        kept_meta.append(
            CategoryVectorMeta(
                id=category.id,
                name=category.name,
            )
        )

    if not vectors:
        return None, None

    return np.stack(vectors), kept_meta


def _compute_batch_cosine_scores(
    category_matrix: np.ndarray, targets: np.ndarray
) -> np.ndarray:
    """여러 텍스트와 사용자 카테고리 벡터 간 코사인 유사도 행렬을 구한다."""

    # category_matrix: (카테고리 수, dim)
    # targets: (텍스트 수, dim)
    if targets.ndim == 1:
        targets = targets.reshape(1, -1)

    return targets @ category_matrix.T


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
