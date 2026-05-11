"""agregar tabla usuarios

Revision ID: 002_usuarios
Revises: 001_initial
Create Date: 2026-05-11 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision:      str                             = "002_usuarios"
down_revision: Union[str, None]                = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on:    Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "usuarios",
        sa.Column("id",              sa.Integer(),   nullable=False),
        sa.Column("username",        sa.String(50),  nullable=False),
        sa.Column("nombre_completo", sa.String(100), nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("rol",             sa.String(20),  nullable=False, server_default="admin"),
        sa.Column("activo",          sa.Boolean(),   nullable=False, server_default=sa.text("true")),
        sa.Column("creado_en",       sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("ultimo_login",    sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usuarios_id",       "usuarios", ["id"])
    op.create_index("ix_usuarios_username", "usuarios", ["username"], unique=True)


def downgrade() -> None:
    op.drop_table("usuarios")