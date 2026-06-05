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

    async def get_by_producto_y_fecha(
        self,
        producto_id: int,
        fecha:       date,
    ) -> SaldoInicial | None:
        """Busca un saldo exacto por producto + fecha."""
        result = await self.db.execute(
            select(SaldoInicial)
            .options(selectinload(SaldoInicial.producto))
            .where(
                SaldoInicial.producto_id == producto_id,
                SaldoInicial.fecha       == fecha,
            )
        )
        return result.scalar_one_or_none()

    async def get_saldo_vigente(
        self,
        producto_id:          int,
        fecha_primer_movimiento: date,
    ) -> SaldoInicial | None:
        """
        Busca el saldo inicial más reciente cuya fecha
        sea <= fecha_primer_movimiento.
        Implementa la lógica del diseño:
        SELECT * FROM saldos_iniciales
        WHERE producto_id = :id AND fecha <= :fecha
        ORDER BY fecha DESC LIMIT 1
        """
        result = await self.db.execute(
            select(SaldoInicial)
            .where(
                SaldoInicial.producto_id == producto_id,
                SaldoInicial.fecha       <= fecha_primer_movimiento,
            )
            .order_by(SaldoInicial.fecha.desc())
            .limit(1)
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
            .order_by(SaldoInicial.producto_id, SaldoInicial.fecha)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    async def count_procesamientos(self, producto_id: int) -> int:
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
        Crea o actualiza el saldo de un producto para una fecha específica.
        Ahora permite múltiples saldos por producto (uno por fecha).
        """
        total_proc = await self.count_procesamientos(producto_id)

        saldo = await self.get_by_producto_y_fecha(producto_id, fecha)
        if saldo:
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
        saldo = await self.get_by_id(saldo_id)
        if not saldo:
            raise KardexException(f"Saldo inicial #{saldo_id} no encontrado.", status_code=404)

        total_proc = await self.count_procesamientos(saldo.producto_id)

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

        if descripcion is not None:
            from app.models.producto import Producto
            await self.db.execute(
                sa_update(Producto)
                .where(Producto.id == saldo.producto_id)
                .values(descripcion=descripcion)
            )

        await self.db.flush()
        saldo = await self.get_by_id(saldo_id)
        return saldo, total_proc

    async def delete(self, saldo_id: int) -> int:
        saldo = await self.get_by_id(saldo_id)
        if not saldo:
            raise KardexException(f"Saldo inicial #{saldo_id} no encontrado.", status_code=404)

        total_proc = await self.count_procesamientos(saldo.producto_id)

        await self.db.execute(
            delete(SaldoInicial).where(SaldoInicial.id == saldo_id)
        )
        await self.db.flush()
        return total_proc