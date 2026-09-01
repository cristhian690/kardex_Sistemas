from pydantic import BaseModel
from typing import List

class EvolucionDia(BaseModel):
    fecha: str
    procesados: int

class TopIncidencia(BaseModel):
    codigo: str
    incidencias: int

class ArchivoReciente(BaseModel):
    id: int
    nombre: str
    fecha: str
    estado: str
    registros: int

class DashboardMetricas(BaseModel):
    evolucion: List[EvolucionDia]
    top_incidencias: List[TopIncidencia]
    ultimos_archivos: List[ArchivoReciente]