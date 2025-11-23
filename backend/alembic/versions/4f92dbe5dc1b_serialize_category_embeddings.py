"""Store category embeddings as serialized float32 blobs

Revision ID: 4f92dbe5dc1b
Revises: 1c1e5e5a0d8b
Create Date: 2025-11-24 00:00:00.000000

"""
from typing import Sequence, Union
import ast
import json

import numpy as np
import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = "4f92dbe5dc1b"
down_revision: Union[str, Sequence[str], None] = "1c1e5e5a0d8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 1024


def _has_column(conn, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(conn)
    columns = inspector.get_columns(table_name)
    return any(col["name"] == column_name for col in columns)


def _coerce_vector(values: object) -> Sequence[float] | None:
    if values is None:
        return None
    if isinstance(values, (list, tuple)):
        return values
    if isinstance(values, (bytes, bytearray, memoryview)):
        arr = np.frombuffer(memoryview(values), dtype=np.float32)
        return arr.tolist()
    if isinstance(values, str):
        try:
            return json.loads(values)
        except json.JSONDecodeError:
            try:
                parsed = ast.literal_eval(values)
                if isinstance(parsed, (list, tuple)):
                    return parsed
            except (ValueError, SyntaxError):
                return None
        except Exception:
            return None
    return values


def _normalize(values: object) -> bytes | None:
    coerced = _coerce_vector(values)
    if coerced is None:
        return None
    arr = np.asarray(coerced, dtype=np.float32)
    if arr.ndim != 1 or arr.size != EMBEDDING_DIM:
        return None
    norm = np.linalg.norm(arr)
    if norm == 0:
        return None
    normalized = arr / norm
    return normalized.astype(np.float32).tobytes()


def upgrade() -> None:
    conn = op.get_bind()
    if not _has_column(conn, "categories", "embedding_bytes"):
        op.add_column(
            "categories",
            sa.Column("embedding_bytes", sa.LargeBinary(), nullable=True),
        )

    result = conn.execute(
        sa.text("SELECT id, embedding FROM categories WHERE embedding IS NOT NULL")
    )
    rows = result.fetchall()
    for row in rows:
        blob = _normalize(row.embedding)
        if blob is None:
            continue
        conn.execute(
            sa.text(
                "UPDATE categories SET embedding_bytes = :blob WHERE id = :id"
            ),
            {"blob": blob, "id": row.id},
        )

    if _has_column(conn, "categories", "embedding"):
        op.drop_column("categories", "embedding")
    if _has_column(conn, "categories", "embedding_bytes"):
        op.alter_column("categories", "embedding_bytes", new_column_name="embedding")


def downgrade() -> None:
    conn = op.get_bind()

    if not _has_column(conn, "categories", "embedding_vector"):
        op.add_column(
            "categories",
            sa.Column("embedding_vector", Vector(EMBEDDING_DIM), nullable=True),
        )

    result = conn.execute(
        sa.text("SELECT id, embedding FROM categories WHERE embedding IS NOT NULL")
    )
    rows = result.fetchall()
    for row in rows:
        blob = row.embedding
        if blob is None:
            continue
        arr = np.frombuffer(blob, dtype=np.float32)
        if arr.size != EMBEDDING_DIM:
            continue
        conn.execute(
            sa.text(
                "UPDATE categories SET embedding_vector = :vec WHERE id = :id"
            ),
            {"vec": arr.tolist(), "id": row.id},
        )

    if _has_column(conn, "categories", "embedding"):
        op.drop_column("categories", "embedding")
    if _has_column(conn, "categories", "embedding_vector"):
        op.alter_column(
            "categories", "embedding_vector", new_column_name="embedding"
        )
