from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories import ProductoRepository, SaldoRepository
from app.schemas.saldo_inicial import (
    SaldoInicialCreate,
    SaldoInicialUpdate,
    SaldoInicialResponse,
    SaldoInicialConAdvertencia,
)
from app.exceptions import KardexException
from decimal import Decimal


class SaldoService:

    def __init__(self, db: AsyncSession):
        self.db           = db
        self.saldo_repo   = SaldoRepository(db)
        self.producto_repo = ProductoRepository(db)

    # ── Listar ────────────────────────────────────────────────────────────────
    async def listar(
        self,
        limit:  int = 100,
        offset: int = 0,
    ) -> list[SaldoInicialResponse]:
        saldos = await self.saldo_repo.get_all(limit=limit, offset=offset)
        return [self._to_response(s) for s in saldos]

    # ── Obtener uno ───────────────────────────────────────────────────────────
    async def obtener(self, saldo_id: int) -> SaldoInicialResponse:
        saldo = await self.saldo_repo.get_by_id(saldo_id)
        if not saldo:
            raise KardexException(f"Saldo inicial #{saldo_id} no encontrado.", status_code=404)
        return self._to_response(saldo)

    # ── Crear ─────────────────────────────────────────────────────────────────
    async def crear(self, data: SaldoInicialCreate) -> SaldoInicialConAdvertencia:
        """
        Crea o actualiza el saldo inicial de un producto.
        Si el producto no existe lo crea automáticamente.
        """
        producto = await self.producto_repo.get_or_create(
            codigo      = data.codigo,
            descripcion = data.descripcion,
        )

        costo_total = data.costo_total or Decimal(str(
            float(data.cantidad) * float(data.costo_unitario)
        ))

        saldo, total_proc = await self.saldo_repo.upsert(
            producto_id    = producto.id,
            fecha          = data.fecha,
            cantidad       = data.cantidad,
            costo_unitario = data.costo_unitario,
            costo_total    = costo_total,
        )

        return SaldoInicialConAdvertencia(
            **self._to_response(saldo).model_dump(),
            advertencia = self._advertencia(total_proc),
        )

    # ── Actualizar ────────────────────────────────────────────────────────────
    async def actualizar(
        self,
        saldo_id: int,
        data:     SaldoInicialUpdate,
    ) -> SaldoInicialConAdvertencia:
        costo_total = data.costo_total or Decimal(str(
            float(data.cantidad) * float(data.costo_unitario)
        ))

        saldo, total_proc = await self.saldo_repo.update(
            saldo_id       = saldo_id,
            fecha          = data.fecha,
            cantidad       = data.cantidad,
            costo_unitario = data.costo_unitario,
            costo_total    = costo_total,
            descripcion    = data.descripcion,
        )

        # Actualizar descripcion del producto si viene en el payload
        if data.descripcion is not None and saldo and saldo.producto_id:
            await self.producto_repo.update(
                producto_id = saldo.producto_id,
                descripcion = data.descripcion,
            )
            # Recargar saldo para que tenga la descripcion actualizada.
            saldo = await self.saldo_repo.get_by_id(saldo_id)

        return SaldoInicialConAdvertencia(
            **self._to_response(saldo).model_dump(),
            advertencia = self._advertencia(total_proc),
        )

    # ── Eliminar ──────────────────────────────────────────────────────────────
    async def eliminar(self, saldo_id: int) -> dict:
        total_proc = await self.saldo_repo.delete(saldo_id)
        return {
            "mensaje":     f"Saldo inicial #{saldo_id} eliminado correctamente.",
            "advertencia": self._advertencia(total_proc),
        }

    # ── Helpers privados ──────────────────────────────────────────────────────
    def _to_response(self, saldo) -> SaldoInicialResponse:
        return SaldoInicialResponse(
            id             = saldo.id,
            producto_id    = saldo.producto_id,
            codigo         = saldo.producto.codigo if saldo.producto else "",
            descripcion    = saldo.producto.descripcion if saldo.producto else None,
            fecha          = saldo.fecha,
            cantidad       = saldo.cantidad,
            costo_unitario = saldo.costo_unitario,
            costo_total    = saldo.costo_total,
            creado_en      = saldo.creado_en,
        )

    def _advertencia(self, total_proc: int) -> str | None:
        if total_proc == 0:
            return None
        return (
            f"Este saldo ya fue usado en {total_proc} procesamiento(s). "
            f"Los procesamientos anteriores no se recalcularán automáticamente. "
            f"Si necesitas corregir resultados pasados, reprocesa el archivo correspondiente."
        )