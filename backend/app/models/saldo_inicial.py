from sqlalchemy import Integer, String, Date, Numeric, DateTime, func, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import date, datetime
from decimal import Decimal


class SaldoInicial(Base):
    __tablename__ = "saldos_iniciales"

    id:             Mapped[int]      = mapped_column(primary_key=True, index=True)
    producto_id:    Mapped[int]      = mapped_column(ForeignKey("productos.id"), nullable=False)
    fecha:          Mapped[date]     = mapped_column(Date(), nullable=False)
    cantidad:       Mapped[Decimal]  = mapped_column(Numeric(22, 10), nullable=False)
    costo_unitario: Mapped[Decimal]  = mapped_column(Numeric(22, 10), nullable=False)
    costo_total:    Mapped[Decimal]  = mapped_column(Numeric(22, 10), nullable=False)
    creado_en:      Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # ── Relación ──────────────────────────────────────────────────────────────
    producto: Mapped["Producto"] = relationship("Producto", back_populates="saldo_inicial")