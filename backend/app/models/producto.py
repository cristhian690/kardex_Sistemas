from sqlalchemy import String, DateTime, func, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime


class Producto(Base):
    __tablename__ = "productos"
    __table_args__ = (
        UniqueConstraint("empresa_id", "codigo", name="uq_producto_empresa_codigo"),
    )

    id:                Mapped[int]      = mapped_column(primary_key=True, index=True)
    empresa_id:        Mapped[int]      = mapped_column(ForeignKey("empresa.id"), nullable=False, index=True)
    codigo:            Mapped[str]      = mapped_column(String(20), nullable=False, index=True)
    descripcion:       Mapped[str]      = mapped_column(String(255), nullable=True)
    codigo_existencia: Mapped[str]      = mapped_column(String(20),  nullable=True)
    unidad_medida:     Mapped[str]      = mapped_column(String(20),  nullable=True)
    creado_en:         Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # ── Relaciones ─────────────────────────────────────────────────────────────
    empresa:        Mapped["Empresa"]            = relationship("Empresa", back_populates="productos")
    saldo_inicial:  Mapped[list["SaldoInicial"]] = relationship("SaldoInicial", back_populates="producto")
    movimientos:    Mapped[list["Movimiento"]]   = relationship("Movimiento",   back_populates="producto")