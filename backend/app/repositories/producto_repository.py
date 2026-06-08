from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.producto import Producto
from app.models.movimiento import Movimiento


class ProductoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def crear(
        self,
        codigo: str,
        empresa_id: int,
        descripcion: str | None = None,
        codigo_existencia: str | None = None,
        unidad_medida: str | None = None,
    ) -> Producto:
        producto = Producto(
            codigo=codigo,
            empresa_id=empresa_id,
            descripcion=descripcion,
            codigo_existencia=codigo_existencia,
            unidad_medida=unidad_medida,
        )
        self.db.add(producto)
        await self.db.flush()
        return producto

    async def get_by_id(self, producto_id: int) -> Producto | None:
        result = await self.db.execute(
            select(Producto)
            .options(selectinload(Producto.empresa),
                     selectinload(Producto.saldos_iniciales))
            .where(Producto.id == producto_id)
        )
        return result.scalar_one_or_none()

    async def get_by_codigo_y_empresa(
        self,
        codigo:     str,
        empresa_id: int,
    ) -> Producto | None:
        result = await self.db.execute(
            select(Producto)
            .options(selectinload(Producto.empresa),
                selectinload(Producto.saldos_iniciales))
            .where(
                Producto.codigo     == codigo,
                Producto.empresa_id == empresa_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        codigo:      str,
        empresa_id:  int,
        descripcion: str | None = None,
    ) -> Producto:
        producto = await self.get_by_codigo_y_empresa(codigo, empresa_id)
        if not producto:
            producto = Producto(
                codigo      = codigo,
                empresa_id  = empresa_id,
                descripcion = descripcion,
            )
            self.db.add(producto)
            await self.db.flush()
        return producto

    async def get_all(
        self,
        empresa_id: int | None = None,
        limit:      int        = 100,
        offset:     int        = 0,
        search:     str | None = None,
    ) -> list[Producto]:
        q = (
            select(Producto)
            .options(selectinload(Producto.empresa),
                    selectinload(Producto.saldos_iniciales))
            .order_by(Producto.codigo)
            .limit(limit)
            .offset(offset)
        )
        if empresa_id:
            q = q.where(Producto.empresa_id == empresa_id)
        if search:
            q = q.where(Producto.codigo.ilike(f"%{search}%"))
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def count(
        self,
        empresa_id: int | None = None,
        search:     str | None = None,
    ) -> int:
        q = select(func.count(Producto.id))
        if empresa_id:
            q = q.where(Producto.empresa_id == empresa_id)
        if search:
            q = q.where(Producto.codigo.ilike(f"%{search}%"))
        result = await self.db.execute(q)
        return result.scalar() or 0

    async def update(
        self,
        producto_id:       int,
        empresa_id:        int | None = None,
        descripcion:       str | None = None,
        codigo_existencia: str | None = None,
        unidad_medida:     str | None = None,
    ) -> Producto | None:
        producto = await self.get_by_id(producto_id)
        if not producto:
            return None

        if empresa_id        is not None: producto.empresa_id        = empresa_id
        if descripcion       is not None: producto.descripcion       = descripcion
        if codigo_existencia is not None: producto.codigo_existencia = codigo_existencia
        if unidad_medida     is not None: producto.unidad_medida     = unidad_medida
        await self.db.flush()
        return producto

    async def count_movimientos(self, producto_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Movimiento.id))
            .where(Movimiento.producto_id == producto_id)
        )
        return result.scalar() or 0

    async def get_or_create_bulk(
        self,
        codigos:    list[str],
        empresa_id: int | None = None,
    ) -> dict[str, Producto]:
        if not codigos:
            return {}

        from app.core.constants import EMPRESA_SIN_ASIGNAR_ID

        # Empresa destino: la seleccionada o SIN ASIGNAR como fallback
        empresa_destino = empresa_id if empresa_id else EMPRESA_SIN_ASIGNAR_ID

        # 1. Búsqueda global en toda la BD por código
        result = await self.db.execute(
            select(Producto).where(Producto.codigo.in_(codigos))
        )
        existentes = {p.codigo: p for p in result.scalars().all()}

        # 2. Identificar cuáles no existen
        faltantes = [c for c in codigos if c not in existentes]

        # 3. Crear los nuevos en la empresa destino
        if faltantes:
            nuevos = [
                Producto(codigo=c, empresa_id=empresa_destino)
                for c in faltantes
            ]
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