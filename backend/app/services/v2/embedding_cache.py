from __future__ import annotations

from collections import OrderedDict
from threading import RLock
from typing import Dict, Tuple

import numpy as np


class _LRUEmbeddingCache:
    """Simple thread-safe LRU cache for sentence embeddings."""

    def __init__(self, max_items: int = 1024) -> None:
        self._max_items = max_items
        self._store: "OrderedDict[str, np.ndarray]" = OrderedDict()
        self._lock = RLock()

    def get(self, key: str) -> np.ndarray | None:
        with self._lock:
            value = self._store.get(key)
            if value is None:
                return None
            # Move to MRU position and return a copy to avoid accidental mutation
            self._store.move_to_end(key)
            return value.copy()

    def set(self, key: str, value: np.ndarray) -> None:
        with self._lock:
            self._store[key] = value.astype(np.float32, copy=True)
            self._store.move_to_end(key)
            if len(self._store) > self._max_items:
                self._store.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


embedding_cache = _LRUEmbeddingCache(max_items=2048)

__all__ = ["embedding_cache"]
