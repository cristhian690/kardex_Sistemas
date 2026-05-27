"""agregar codigo_existencia y unidad_medida a empresa

Revision ID: 1d2b23d74365
Revises: 002_usuarios
Create Date: 2026-05-26 23:36:11.099869

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '1d2b23d74365'
down_revision: Union[str, None] = '002_usuarios'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('empresa', sa.Column('codigo_existencia', sa.String(length=20), nullable=True))
    op.add_column('empresa', sa.Column('unidad_medida', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('empresa', 'unidad_medida')
    op.drop_column('empresa', 'codigo_existencia')