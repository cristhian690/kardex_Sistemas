from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional


class MovimientoBase(BaseModel):
    fecha:            date
    tipo_comprobante: int
    serie:            str
    numero:           str
    tipo_operacion:   str

    # Entradas
    ent_cantidad:    Decimal = Decimal("0")
    ent_costo_unit:  Decimal = Decimal("0")
    ent_costo_total: Decimal = Decimal("0")

    # Salidas
    sal_cantidad:    Decimal = Decimal("0")
    sal_costo_unit:  Decimal = Decimal("0")
    sal_costo_total: Decimal = Decimal("0")


class MovimientoResponse(MovimientoBase):
    id:               int
    producto_id:      int
    procesamiento_id: int

    # Código del producto — viene del join con productos
    codigo: Optional[str] = None

    # Saldo final calculado
    saldo_cantidad:    Decimal
    saldo_costo_unit:  Decimal
    saldo_costo_total: Decimal

    # Valores originales del Excel (auditoría)
    orig_ent_costo_unit:  Decimal
    orig_ent_costo_total: Decimal
    orig_sal_costo_unit:  Decimal
    orig_sal_costo_total: Decimal

    # Flags de validación consolidados
    saldo_negativo: bool
    error_a:        bool   # calculado vs original
    error_b:        bool   # consistencia interna

    costo_reconstruido: bool = False

    # Semáforo calculado en runtime (no viene de BD)
    semaforo: Literal["🟢", "🟡", "🔴", "⚫"] = "🟢"

    # Número de fila calculado en runtime (NO persistido)
    fila: int = 0

    creado_en: datetime

    # identifica la fila sintética de saldo inicial
    es_saldo_inicial: bool = False

    model_config = {"from_attributes": True}