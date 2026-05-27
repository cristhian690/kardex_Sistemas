from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.database import Base


class Empresa(Base):
    __tablename__ = "empresa"

    id                = Column(Integer, primary_key=True, index=True)
    codigo_producto   = Column(String(20),  unique=True, nullable=False, index=True)
    razon_social      = Column(String(200), nullable=False)
    ruc               = Column(String(20),  nullable=False)
    establecimiento   = Column(String(100), nullable=True, default="Almacén")
    tipo              = Column(String(100), nullable=True, default="Mercadería")
    codigo_existencia = Column(String(20),  nullable=True)   # ← NUEVO
    unidad_medida     = Column(String(20),  nullable=True, default="01")  # ← NUEVO
    metodo_valuacion  = Column(String(100), nullable=True, default="Costo Promedio")
    creado_en         = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())