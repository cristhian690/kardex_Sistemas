
from sqlalchemy import String, Integer, DateTime, JSON, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime
from typing import Optional
import enum


class EstadoProceso(str, enum.Enum):
    pendiente  = "pendiente"
    procesado  = "procesado"
    error      = "error"
    con_alertas = "con_alertas"


class Procesamiento(Base):
    __tablename__ = "procesamientos"

    id:                    Mapped[int]            = mapped_column(primary_key=True, index=True)
    nombre_archivo:        Mapped[str]            = mapped_column(String(500), nullable=False)
    total_registros:       Mapped[int]            = mapped_column(Integer, default=0)
    productos_procesados:  Mapped[int]            = mapped_column(Integer, default=0)
    estado:                Mapped[EstadoProceso]  = mapped_column(
                                                        SAEnum(EstadoProceso, name="estado_proceso"),
                                                        nullable=False
                                                    )
    alertas:               Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    creado_en:             Mapped[datetime]       = mapped_column(DateTime(timezone=True), server_default=func.now())

    # ── Relaciones ─────────────────────────────────────────────────────────────
    movimientos: Mapped[list["Movimiento"]] = relationship("Movimiento", back_populates="procesamiento")