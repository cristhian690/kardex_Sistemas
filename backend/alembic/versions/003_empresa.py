"""add_direccion_to_empresa

Revision ID: 003_empresa
Revises: 002_usuarios
Create Date: 2026-06-02

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision:      str                             = "003_empresa"
down_revision: Union[str, None]                = "002_usuarios"
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('empresa', sa.Column('direccion', sa.String(length=300), nullable=True))


def downgrade() -> None:
    op.drop_column('empresa', 'direccion')