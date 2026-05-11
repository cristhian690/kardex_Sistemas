from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.producto import Producto
from app.models.movimiento import Movimiento
from app.models.saldo_inicial import SaldoInicial


class ProductoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, producto_id: int) -> Producto | None:
        result = await self.db.execute(
            select(Producto)
            .options(selectinload(Producto.saldo_inicial))
            .where(Producto.id == producto_id)
        )
        return result.scalar_one_or_none()

    async def get_by_codigo(self, codigo: str) -> Producto | None:
        result = await self.db.execute(
            select(Producto)
            .options(selectinload(Producto.saldo_inicial))
            .where(Producto.codigo == codigo)
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        codigo:      str,
        descripcion: str | None = None,
    ) -> Producto:
        producto = await self.get_by_codigo(codigo)
        if not producto:
            producto = Producto(codigo=codigo, descripcion=descripcion)
            self.db.add(producto)
            await self.db.flush()
        return producto

    async def get_all(
        self,
        limit:  int = 100,
        offset: int = 0,
        search: str | None = None,
    ) -> list[Producto]:
        q = (
            select(Producto)
            .options(selectinload(Producto.saldo_inicial))
            .order_by(Producto.codigo)
            .limit(limit)
            .offset(offset)
        )
        if search:
            q = q.where(Producto.codigo.ilike(f"%{search}%"))
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def count(self, search: str | None = None) -> int:
        q = select(func.count(Producto.id))
        if search:
            q = q.where(Producto.codigo.ilike(f"%{search}%"))
        result = await self.db.execute(q)
        return result.scalar() or 0

    async def update(
        self,
        producto_id: int,
        descripcion: str | None,
    ) -> Producto | None:
        producto = await self.get_by_id(producto_id)
        if not producto:
            return None
        producto.descripcion = descripcion
        await self.db.flush()
        return producto

    async def count_movimientos(self, producto_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Movimiento.id))
            .where(Movimiento.producto_id == producto_id)
        )
        return result.scalar() or 0
    
    async def get_or_create_bulk(self, codigos: list[str]) -> dict[str, Producto]:
        """
        Versión optimizada para procesar muchos códigos a la vez.
        Crea los que falten en una sola operación.
        Retorna dict { codigo: Producto }
        """
        if not codigos:
            return {}

        # 1 sola query para traer todos los existentes
        result = await self.db.execute(
            select(Producto).where(Producto.codigo.in_(codigos))
        )
        existentes = {p.codigo: p for p in result.scalars().all()}

        # Detectar los que faltan
        faltantes = [c for c in codigos if c not in existentes]

        # Crear los faltantes en una sola operación
        if faltantes:
            nuevos = [Producto(codigo=c) for c in faltantes]
            self.db.add_all(nuevos)
            await self.db.flush()
            for p in nuevos:
                existentes[p.codigo] = p

        return existentes

    async def delete(self, producto_id: int) -> bool:
        producto = await self.get_by_id(producto_id)
        if not producto:
            return False
        await self.db.delete(producto)
        await self.db.flush()
        return True