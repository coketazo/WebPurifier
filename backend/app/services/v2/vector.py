from __future__ import annotations

from typing import Iterable

import numpy as np

from app.v2.models import EMBEDDING_DIM


VectorInput = np.ndarray | Iterable[float]


def _as_float32_vector(values: VectorInput) -> np.ndarray:
    arr = np.asarray(values, dtype=np.float32)
    if arr.ndim != 1:
        raise ValueError("Embedding must be 1-D vector.")
    if arr.size != EMBEDDING_DIM:
        raise ValueError(
            f"Embedding dimension mismatch: expected {EMBEDDING_DIM}, got {arr.size}."
        )
    return arr


def normalize_vector(values: VectorInput) -> np.ndarray:
    arr = _as_float32_vector(values)
    norm = np.linalg.norm(arr)
    if norm == 0:
        raise ValueError("Cannot normalize zero vector.")
    return arr / norm


def serialize_vector(values: VectorInput) -> bytes:
    arr = _as_float32_vector(values)
    return arr.tobytes()


def serialize_normalized_vector(values: VectorInput) -> bytes:
    return serialize_vector(normalize_vector(values))


def deserialize_vector(blob: bytes | bytearray | memoryview) -> np.ndarray:
    if blob is None:
        raise ValueError("Embedding blob is None.")
    buffer = memoryview(blob)
    arr = np.frombuffer(buffer, dtype=np.float32)
    if arr.size != EMBEDDING_DIM:
        raise ValueError(
            f"Embedding blob size mismatch: expected {EMBEDDING_DIM}, got {arr.size}."
        )
    return np.array(arr, copy=True)
