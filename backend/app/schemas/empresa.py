from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EmpresaCreate(BaseModel):
    nombre:    str
    ruc:       str
    direccion: Optional[str] = None


class EmpresaUpdate(BaseModel):
    nombre:    Optional[str] = None
    ruc:       Optional[str] = None
    direccion: Optional[str] = None


class EmpresaResponse(BaseModel):
    id:        int
    nombre:    str
    ruc:       str
    direccion: Optional[str] = None
    creado_en: datetime

    model_config = {"from_attributes": True}