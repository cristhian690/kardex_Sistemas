from sqlalchemy import (
    ForeignKey, Date, Numeric, SmallInteger, String,
    Boolean, DateTime, func, CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime, date
from decimal import Decimal


class Movimiento(Base):
    __tablename__ = "movimientos"
    __table_args__ = (
        CheckConstraint("ent_cantidad >= 0", name="ck_ent_cantidad"),
        CheckConstraint("sal_cantidad >= 0", name="ck_sal_cantidad"),
    )

    id:               Mapped[int]  = mapped_column(primary_key=True, index=True)
    producto_id:      Mapped[int]  = mapped_column(ForeignKey("productos.id", ondelete="CASCADE"), nullable=False, index=True)
    procesamiento_id: Mapped[int]  = mapped_column(ForeignKey("procesamientos.id"), nullable=False, index=True)

    fecha:            Mapped[date] = mapped_column(Date,          nullable=False, index=True)
    tipo_comprobante: Mapped[int]  = mapped_column(SmallInteger,  nullable=False)
    serie:            Mapped[str]  = mapped_column(String(10),    nullable=False)
    numero:           Mapped[str]  = mapped_column(String(20),    nullable=False)
    tipo_operacion:   Mapped[str]  = mapped_column(String(50),    nullable=False, index=True)

    ent_cantidad:     Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    ent_costo_unit:   Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    ent_costo_total:  Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)

    sal_cantidad:     Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    sal_costo_unit:   Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    sal_costo_total:  Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)

    saldo_cantidad:    Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    saldo_costo_unit:  Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    saldo_costo_total: Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)

    orig_ent_costo_unit:  Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    orig_ent_costo_total: Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    orig_sal_costo_unit:  Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)
    orig_sal_costo_total: Mapped[Decimal] = mapped_column(Numeric(22, 10), default=0)

    saldo_negativo: Mapped[bool] = mapped_column(Boolean, server_default="false")
    error_a:        Mapped[bool] = mapped_column(Boolean, server_default="false")
    error_b:        Mapped[bool] = mapped_column(Boolean, server_default="false")

    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    producto:      Mapped["Producto"]      = relationship("Producto",      back_populates="movimientos")
    procesamiento: Mapped["Procesamiento"] = relationship("Procesamiento", back_populates="movimientos")