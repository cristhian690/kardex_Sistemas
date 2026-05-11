from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String(50), unique=True, index=True, nullable=False)
    nombre_completo = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    rol             = Column(String(20), nullable=False, default="admin")
    activo          = Column(Boolean, nullable=False, default=True)
    creado_en       = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ultimo_login    = Column(DateTime(timezone=True), nullable=True)