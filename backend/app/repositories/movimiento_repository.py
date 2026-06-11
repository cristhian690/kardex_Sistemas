from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, extract, delete
from sqlalchemy.orm import joinedload  # CAMBIADO: Importamos joinedload en lugar de selectinload
from app.models.movimiento import Movimiento
from app.models.producto import Producto  # Necesario para la referencia encadenada
from datetime import date
from decimal import Decimal


class MovimientoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def crear_bulk(self, movimientos: list[dict]) -> None:
        """Inserta múltiples movimientos de una vez."""
        objs = [Movimiento(**m) for m in movimientos]
        self.db.add_all(objs)
        await self.db.flush()

    async def get_by_procesamiento(self, procesamiento_id: int) -> list[Movimiento]:
        # Añadido joinedload encadenado aquí también para búsquedas por lote completo
        result = await self.db.execute(
            select(Movimiento)
            .options(
                joinedload(Movimiento.producto).joinedload(Producto.empresa)
            )
            .where(Movimiento.procesamiento_id == procesamiento_id)
            .order_by(Movimiento.fecha, Movimiento.id)
        )
        return list(result.scalars().all())

    async def get_by_codigo(
        self,
        codigo:        str,
        procesamiento_id: int,
    ) -> list[Movimiento]:
        # Añadido joinedload encadenado para las consultas directas por código
        result = await self.db.execute(
            select(Movimiento)
            .join(Movimiento.producto)
            .options(
                joinedload(Movimiento.producto).joinedload(Producto.empresa)
            )
            .where(
                and_(
                    Movimiento.procesamiento_id == procesamiento_id,
                    Movimiento.producto.has(codigo=codigo),
                )
            )
            .order_by(Movimiento.fecha, Movimiento.id)
        )
        return list(result.scalars().all())

    async def get_filtrado(
        self,
        procesamiento_id: int,
        codigo:           str | None  = None,
        anio:             int | None  = None,
        mes:              int | None  = None,
        fecha_exacta:     date | None = None,
        fecha_desde:      date | None = None,
        fecha_hasta:      date | None = None,
    ) -> list[Movimiento]:
        """Consulta movimientos con filtros opcionales cargando la metadata corporativa."""
        conditions = [Movimiento.procesamiento_id == procesamiento_id]

        if codigo:
            conditions.append(Movimiento.producto.has(codigo=codigo))

        if fecha_exacta:
            conditions.append(Movimiento.fecha == fecha_exacta)
        elif fecha_desde and fecha_hasta:
            conditions.append(Movimiento.fecha >= fecha_desde)
            conditions.append(Movimiento.fecha <= fecha_hasta)
        elif anio:
            conditions.append(extract("year", Movimiento.fecha) == anio)
            if mes:
                conditions.append(extract("month", Movimiento.fecha) == mes)

        # EL FIX MAESTRO: joinedload en cascada profunda (Movimiento -> Producto -> Empresa)
        result = await self.db.execute(
            select(Movimiento)
            .options(
                joinedload(Movimiento.producto).joinedload(Producto.empresa)
            )
            .where(and_(*conditions))
            .order_by(Movimiento.fecha, Movimiento.id)
        )
        return list(result.scalars().all())

    async def delete_by_procesamiento(self, procesamiento_id: int) -> None:
        await self.db.execute(
            delete(Movimiento).where(Movimiento.procesamiento_id == procesamiento_id)
        )

    async def get_saldo_anterior(
        self,
        procesamiento_id: int,
        codigo: str,
        antes_de: date,
    ) -> Movimiento | None:
        """
        Devuelve el último movimiento del código ANTES de la fecha indicada.
        Se usa para construir la fila 'SALDO INICIAL' al filtrar por mes.
        """
        # Cambiado selectinload por el joinedload anidado para la fila base temporal
        result = await self.db.execute(
            select(Movimiento)
            .options(
                joinedload(Movimiento.producto).joinedload(Producto.empresa)
            )
            .join(Movimiento.producto)
            .where(
                and_(
                    Movimiento.procesamiento_id == procesamiento_id,
                    Movimiento.producto.has(codigo=codigo),
                    Movimiento.fecha < antes_de,
                )
            )
            .order_by(Movimiento.fecha.desc(), Movimiento.id.desc())
            .limit(1)
        )
        return result.scalars().first()