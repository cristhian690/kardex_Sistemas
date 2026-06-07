from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

class ProductoCreate(BaseModel):
    empresa_id: int
    codigo: str
    descripcion: str | None = None
    codigo_existencia: str | None = None
    unidad_medida: str | None = None
    
class ProductoUpdate(BaseModel):
    empresa_id: Optional[int] = None
    descripcion: Optional[str] = None
    codigo_existencia: Optional[str] = None
    unidad_medida: Optional[str] = None


class SaldoInicialResumen(BaseModel):
    id:             int
    fecha:          date
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
    saldos_iniciales:     Optional[list[SaldoInicialResumen]] = None

    model_config = {"from_attributes": True}


class ProductoConEstadisticas(ProductoResponse):
    total_movimientos:    int = 0
    total_procesamientos: int = 0