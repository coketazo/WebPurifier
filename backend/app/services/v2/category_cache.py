from __future__ import annotations

import time
from dataclasses import dataclass
from threading import RLock
from typing import Dict, List, Optional, Tuple

import numpy as np

# 캐시 만료 시간 (초)
_CACHE_TTL_SECONDS = 120.0


@dataclass(frozen=True)
class CategoryVectorMeta:
    id: int
    name: str


@dataclass(frozen=True)
class _CacheEntry:
    matrix: np.ndarray
    meta: List[CategoryVectorMeta]
    stored_at: float


_cache: Dict[int, _CacheEntry] = {}
_cache_lock = RLock()


def get_cached_category_vectors(
    user_id: int,
) -> Optional[Tuple[np.ndarray, List[CategoryVectorMeta]]]:
    """TTL 내 사용자 카테고리 벡터 캐시를 반환한다."""

    with _cache_lock:
        entry = _cache.get(user_id)
        if entry is None:
            return None
        if time.time() - entry.stored_at > _CACHE_TTL_SECONDS:
            _cache.pop(user_id, None)
            return None
        return entry.matrix, entry.meta


def set_cached_category_vectors(
    user_id: int,
    matrix: np.ndarray,
    meta: List[CategoryVectorMeta],
) -> None:
    """사용자 카테고리 벡터 캐시를 갱신한다."""

    with _cache_lock:
        _cache[user_id] = _CacheEntry(
            matrix=matrix,
            meta=list(meta),
            stored_at=time.time(),
        )


def invalidate_category_cache(user_id: int) -> None:
    """특정 사용자의 벡터 캐시를 무효화한다."""

    with _cache_lock:
        _cache.pop(user_id, None)


def clear_category_cache() -> None:
    """테스트나 유지보수용 전체 캐시 삭제."""

    with _cache_lock:
        _cache.clear()
