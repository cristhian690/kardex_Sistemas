from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from app.models.saldo_inicial import SaldoInicial
from app.models.movimiento import Movimiento
from app.exceptions import KardexException
from datetime import date
from decimal import Decimal
from sqlalchemy import update as sa_update


class SaldoRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Lectura ───────────────────────────────────────────────────────────────

    async def get_by_id(self, saldo_id: int) -> SaldoInicial | None:
        result = await self.db.execute(
            select(SaldoInicial)
            .options(selectinload(SaldoInicial.producto))
            .where(SaldoInicial.id == saldo_id)
        )
        return result.scalar_one_or_none()

    async def get_by_producto(self, producto_id: int) -> SaldoInicial | None:
        result = await self.db.execute(
            select(SaldoInicial)
            .options(selectinload(SaldoInicial.producto))
            .where(SaldoInicial.producto_id == producto_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        limit:  int = 100,
        offset: int = 0,
    ) -> list[SaldoInicial]:
        result = await self.db.execute(
            select(SaldoInicial)
            .options(selectinload(SaldoInicial.producto))
            .order_by(SaldoInicial.producto_id)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_procesamientos(self, producto_id: int) -> int:
        """
        Cuenta cuántos procesamientos tienen movimientos de este producto.
        Se usa para mostrar advertencia antes de editar o borrar.
        No bloquea — solo informa.
        """
        result = await self.db.execute(
            select(func.count(Movimiento.procesamiento_id.distinct()))
            .where(Movimiento.producto_id == producto_id)
        )
        return result.scalar() or 0

    # ── Escritura ─────────────────────────────────────────────────────────────

    async def upsert(
        self,
        producto_id:    int,
        fecha:          date,
        cantidad:       Decimal,
        costo_unitario: Decimal,
        costo_total:    Decimal,
    ) -> tuple[SaldoInicial, int]:
        """
        Crea o actualiza el saldo inicial de un producto.
        Retorna (saldo, total_procesamientos) para que el servicio
        pueda incluir la advertencia si total_procesamientos > 0.
        """
        total_proc = await self.count_procesamientos(producto_id)

        saldo = await self.get_by_producto(producto_id)
        if saldo:
            saldo.fecha          = fecha
            saldo.cantidad       = cantidad
            saldo.costo_unitario = costo_unitario
            saldo.costo_total    = costo_total
        else:
            saldo = SaldoInicial(
                producto_id    = producto_id,
                fecha          = fecha,
                cantidad       = cantidad,
                costo_unitario = costo_unitario,
                costo_total    = costo_total,
            )
            self.db.add(saldo)

        await self.db.flush()
        return saldo, total_proc

    async def update(
        self,
        saldo_id:       int,
        fecha:          date,
        cantidad:       Decimal,
        costo_unitario: Decimal,
        costo_total:    Decimal,
        descripcion:    str | None = None,
    ) -> tuple[SaldoInicial, int]:
        """
        Actualiza un saldo por su ID usando UPDATE directo.
        Retorna (saldo, total_procesamientos) para mostrar advertencia.
        """
        saldo = await self.get_by_id(saldo_id)
        if not saldo:
            raise KardexException(f"Saldo inicial #{saldo_id} no encontrado.", status_code=404)

        total_proc = await self.count_procesamientos(saldo.producto_id)

        # UPDATE directo — garantizará la persistencia independiente del tracking
        #Actualizar saldo
        await self.db.execute(
            sa_update(SaldoInicial)
            .where(SaldoInicial.id == saldo_id)
            .values(
                fecha          = fecha,
                cantidad       = cantidad,
                costo_unitario = costo_unitario,
                costo_total    = costo_total,
            )
        )

        #Actualizar descripcion en productos (ya que es donde vive ese campo)
        if descripcion is not None:
            from app.models.producto import Producto
            await self.db.execute(
                sa_update(Producto)
                .where(Producto.id == saldo.producto_id)
                .values(descripcion=descripcion)
            )

        await self.db.flush()

        #Recargar el objeto actualizado
        saldo = await self.get_by_id(saldo_id)
        return saldo, total_proc

    async def delete(self, saldo_id: int) -> int:
        """
        SE Elimina un saldo por su ID usando DELETE directo.
        Retorna total_procesamientos para la advertencia.
        """
        
        saldo = await self.get_by_id(saldo_id)
        if not saldo:
            raise KardexException(f"Saldo inicial #{saldo_id} no encontrado.", status_code=404)

        total_proc = await self.count_procesamientos(saldo.producto_id)

        # DELETE directo — evita problemas de tracking con objetos cargados via join
        await self.db.execute(
            delete(SaldoInicial).where(SaldoInicial.id == saldo_id)
        )
        await self.db.flush()
        return total_proc