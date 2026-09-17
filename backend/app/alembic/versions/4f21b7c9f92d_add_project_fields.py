"""add project fields

Revision ID: 4f21b7c9f92d
Revises: 6b31aa8edda0
Create Date: 2026-09-16 19:15:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f21b7c9f92d'
down_revision: Union[str, None] = '6b31aa8edda0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the ProjectType enum with LOWERCASE values to match SQLAlchemy model
    project_type_enum = sa.Enum('carbon', 'biodiversity', 'carbon_biodiversity', name='projecttype')
    project_type_enum.create(op.get_bind(), checkfirst=True)
    
    # Add project_type column with temporary server_default for existing rows
    op.add_column(
        'projects',
        sa.Column('project_type', project_type_enum, nullable=False, server_default='carbon')
    )
    
    # Remove the temporary server_default so future inserts don't default to 'carbon'
    op.alter_column(
        'projects',
        'project_type',
        server_default=None
    )
    
    # Add date fields (nullable)
    op.add_column('projects', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column('projects', sa.Column('end_date', sa.Date(), nullable=True))
    
    # Add area and target fields (nullable)
    op.add_column('projects', sa.Column('total_area', sa.Float(), nullable=True))
    op.add_column('projects', sa.Column('carbon_target', sa.Float(), nullable=True))
    op.add_column('projects', sa.Column('biodiversity_target', sa.Float(), nullable=True))


def downgrade() -> None:
    # Drop columns in reverse order
    op.drop_column('projects', 'biodiversity_target')
    op.drop_column('projects', 'carbon_target')
    op.drop_column('projects', 'total_area')
    op.drop_column('projects', 'end_date')
    op.drop_column('projects', 'start_date')
    op.drop_column('projects', 'project_type')
    
    # Drop the enum type
    op.execute('DROP TYPE IF EXISTS projecttype')