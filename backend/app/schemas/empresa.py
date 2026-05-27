from pydantic import BaseModel
from typing import Optional


class EmpresaBase(BaseModel):
    codigo_producto:   str
    razon_social:      str
    ruc:               str
    establecimiento:   Optional[str] = "Almacén"
    tipo:              Optional[str] = "Mercadería"
    codigo_existencia: Optional[str] = None         # ← NUEVO
    unidad_medida:     Optional[str] = "01"          # ← NUEVO
    metodo_valuacion:  Optional[str] = "Costo Promedio"


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseModel):
    razon_social:      Optional[str] = None
    ruc:               Optional[str] = None
    establecimiento:   Optional[str] = None
    tipo:              Optional[str] = None
    codigo_existencia: Optional[str] = None         # ← NUEVO
    unidad_medida:     Optional[str] = None          # ← NUEVO
    metodo_valuacion:  Optional[str] = None


class EmpresaResponse(EmpresaBase):
    id: int

    class Config:
        from_attributes = True