from pydantic import BaseModel, model_validator
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


class SaldoInicialCreate(BaseModel):
    empresa_id:     int
    codigo:         str
    descripcion:    Optional[str]     = None
    fecha:          date
    cantidad:       Decimal
    costo_unitario: Decimal
    costo_total:    Optional[Decimal] = None

    @model_validator(mode="after")
    def calcular_costo_total(self):
        if self.costo_total is None:
            self.costo_total = Decimal(str(
                round(float(self.cantidad) * float(self.costo_unitario), 6)
            ))
        return self


class SaldoInicialUpdate(BaseModel):
    descripcion:    Optional[str]     = None
    fecha:          date
    cantidad:       Decimal
    costo_unitario: Decimal
    costo_total:    Optional[Decimal] = None

    @model_validator(mode="after")
    def calcular_costo_total(self):
        if self.costo_total is None:
            self.costo_total = Decimal(str(
                round(float(self.cantidad) * float(self.costo_unitario), 6)
            ))
        return self


class SaldoInicialResponse(BaseModel):
    id:             int
    empresa_id:     int
    producto_id:    int
    codigo:         str
    descripcion:    Optional[str]
    fecha:          date
    cantidad:       Decimal
    costo_unitario: Decimal
    costo_total:    Decimal
    creado_en:      datetime

    model_config = {"from_attributes": True}


class SaldoInicialConAdvertencia(SaldoInicialResponse):
    advertencia: Optional[str] = None


class EliminarMultipleSaldosRequest(BaseModel):
    ids: list[int]