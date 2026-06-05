from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime


class Empresa(Base):
    __tablename__ = "empresa"

    id:        Mapped[int]      = mapped_column(primary_key=True, index=True)
    nombre:    Mapped[str]      = mapped_column(String(200), nullable=False)
    ruc:       Mapped[str]      = mapped_column(String(20),  nullable=False, unique=True)
    direccion: Mapped[str]      = mapped_column(String(300), nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # ── Relación ──────────────────────────────────────────────────────────────
    productos: Mapped[list["Producto"]] = relationship("Producto", back_populates="empresa")