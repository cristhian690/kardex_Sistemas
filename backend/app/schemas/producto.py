from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from typing import Optional


class ProductoUpdate(BaseModel):
    descripcion:       Optional[str] = None
    codigo_existencia: Optional[str] = None
    unidad_medida:     Optional[str] = None


class SaldoInicialResumen(BaseModel):
    id:             int
    fecha:          str
    cantidad:       Decimal
    costo_unitario: Decimal
    costo_total:    Decimal

    model_config = {"from_attributes": True}


class ProductoResponse(BaseModel):
    id:                int
    empresa_id:        int
    codigo:            str
    descripcion:       Optional[str]
    codigo_existencia: Optional[str]
    unidad_medida:     Optional[str]
    creado_en:         datetime
    saldo_inicial:     Optional[list[SaldoInicialResumen]] = None

    model_config = {"from_attributes": True}


class ProductoConEstadisticas(ProductoResponse):
    total_movimientos:    int = 0
    total_procesamientos: int = 0