from sqlalchemy import (
    ForeignKey, Date, Numeric, SmallInteger, String,
    Boolean, DateTime, func, Enum as SAEnum,
    CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime, date
from decimal import Decimal
import enum


class TipoOperacion(str, enum.Enum):
    venta                  = "01 Venta"
    compra                 = "02 Compra"
    devolucion             = "05 Devolucion Recibida"
    devolucion_entregada   = "06 Devolucion Entregada"   # ✅ NUEVO


class Movimiento(Base):
    __tablename__ = "movimientos"
    __table_args__ = (
        # Evita duplicados dentro del mismo procesamiento
        UniqueConstraint(
            "procesamiento_id", "producto_id", "serie", "numero",
            name="unique_movimiento_procesamiento"
        ),
        CheckConstraint("ent_cantidad >= 0", name="ck_ent_cantidad"),
        CheckConstraint("sal_cantidad >= 0", name="ck_sal_cantidad"),
    )

    id:               Mapped[int]           = mapped_column(primary_key=True, index=True)
    producto_id:      Mapped[int]           = mapped_column(ForeignKey("productos.id"),      nullable=False, index=True)
    procesamiento_id: Mapped[int]           = mapped_column(ForeignKey("procesamientos.id"), nullable=False, index=True)

    # ── Comprobante ────────────────────────────────────────────────────────────
    fecha:            Mapped[date]          = mapped_column(Date,           nullable=False, index=True)
    tipo_comprobante: Mapped[int]           = mapped_column(SmallInteger,   nullable=False)
    serie:            Mapped[str]           = mapped_column(String(10),     nullable=False)
    numero:           Mapped[str]           = mapped_column(String(20),     nullable=False)
    tipo_operacion:   Mapped[TipoOperacion] = mapped_column(
                                                SAEnum(TipoOperacion, name="tipo_operacion_enum"),
                                                nullable=False,
                                                index=True
                                            )

    # ── Entradas ───────────────────────────────────────────────────────────────
    ent_cantidad:     Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    ent_costo_unit:   Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    ent_costo_total:  Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)

    # ── Salidas ────────────────────────────────────────────────────────────────
    sal_cantidad:     Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    sal_costo_unit:   Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    sal_costo_total:  Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)

    # ── Saldo final calculado ──────────────────────────────────────────────────
    saldo_cantidad:   Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    saldo_costo_unit: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    saldo_costo_total: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)

    # ── Datos originales del Excel (auditoría) ─────────────────────────────────
    orig_ent_costo_unit:  Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    orig_ent_costo_total: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    orig_sal_costo_unit:  Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)
    orig_sal_costo_total: Mapped[Decimal] = mapped_column(Numeric(18, 6), default=0)

    # ── Flags de validación (sin semáforo — se calcula en runtime) ─────────────
    saldo_negativo: Mapped[bool] = mapped_column(Boolean, default=False)
    error_a:        Mapped[bool] = mapped_column(Boolean, default=False)  # calculado vs original
    error_b:        Mapped[bool] = mapped_column(Boolean, default=False)  # consistencia interna

    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # ── Relaciones ─────────────────────────────────────────────────────────────
    producto:      Mapped["Producto"]      = relationship("Producto",      back_populates="movimientos")
    procesamiento: Mapped["Procesamiento"] = relationship("Procesamiento", back_populates="movimientos")