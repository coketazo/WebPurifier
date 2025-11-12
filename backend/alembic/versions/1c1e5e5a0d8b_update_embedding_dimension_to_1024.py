"""Increase embedding vector dimension to 1024

Revision ID: 1c1e5e5a0d8b
Revises: d8ae1de7be0e
Create Date: 2024-06-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "1c1e5e5a0d8b"
down_revision: Union[str, Sequence[str], None] = "d8ae1de7be0e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE categories ALTER COLUMN embedding TYPE vector(1024);")
    op.execute(
        "ALTER TABLE feedback_logs ALTER COLUMN text_embedding TYPE vector(1024);"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE categories ALTER COLUMN embedding TYPE vector(768);")
    op.execute(
        "ALTER TABLE feedback_logs ALTER COLUMN text_embedding TYPE vector(768);"
    )
