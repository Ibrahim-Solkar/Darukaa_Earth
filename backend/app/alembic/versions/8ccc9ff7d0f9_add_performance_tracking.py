"""add_performance_tracking

Revision ID: 8ccc9ff7d0f9
Revises: 4f21b7c9f92d
Create Date: 2026-09-17 16:30:13.480142

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8ccc9ff7d0f9"
down_revision: Union[str, Sequence[str], None] = "4f21b7c9f92d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "performance",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("site_id", sa.Integer(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("carbon_value", sa.Float(), nullable=False),
        sa.Column("biodiversity_score", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["site_id"],
            ["sites.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_performance_id",
        "performance",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_performance_site_id",
        "performance",
        ["site_id"],
        unique=False,
    )

    op.create_index(
        "ix_performance_recorded_at",
        "performance",
        ["recorded_at"],
        unique=False,
    )

    op.create_index(
        "ix_performance_site_recorded",
        "performance",
        ["site_id", "recorded_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_performance_site_recorded",
        table_name="performance",
    )

    op.drop_index(
        "ix_performance_recorded_at",
        table_name="performance",
    )

    op.drop_index(
        "ix_performance_site_id",
        table_name="performance",
    )

    op.drop_index(
        "ix_performance_id",
        table_name="performance",
    )

    op.drop_table("performance")