from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories import ProductoRepository
from app.models.movimiento import Movimiento
from app.schemas.producto import ProductoResponse, ProductoConEstadisticas, ProductoUpdate
from app.exceptions import KardexException


class ProductoService:

    def __init__(self, db: AsyncSession):
        self.db            = db
        self.producto_repo = ProductoRepository(db)

    # ── Listar ────────────────────────────────────────────────────────────────
    async def listar(
        self,
        limit:      int        = 100,
        offset:     int        = 0,
        search:     str | None = None,
        empresa_id: int | None = None,   # ✅ NUEVO: filtrar por empresa
    ) -> dict:
        productos = await self.producto_repo.get_all(
            limit=limit,
            offset=offset,
            search=search,
            empresa_id=empresa_id,
        )
        total = await self.producto_repo.count(
            search=search,
            empresa_id=empresa_id,
        )

        return {
            "total":     total,
            "productos": [ProductoResponse.model_validate(p) for p in productos],
        }

    # ── Obtener uno con estadísticas ──────────────────────────────────────────
    async def obtener(self, producto_id: int) -> ProductoConEstadisticas:
        producto = await self.producto_repo.get_by_id(producto_id)
        if not producto:
            raise KardexException(f"Producto #{producto_id} no encontrado.", status_code=404)

        total_mov = await self.producto_repo.count_movimientos(producto_id)

        result = await self.db.execute(
            select(func.count(Movimiento.procesamiento_id.distinct()))
            .where(Movimiento.producto_id == producto_id)
        )
        total_proc = result.scalar() or 0

        return ProductoConEstadisticas(
            **ProductoResponse.model_validate(producto).model_dump(),
            total_movimientos    = total_mov,
            total_procesamientos = total_proc,
        )

    # ── Actualizar ────────────────────────────────────────────────────────────
    async def actualizar(
        self,
        producto_id: int,
        data:        ProductoUpdate,
    ) -> ProductoResponse:
        # ✅ NUEVO: ahora también actualiza codigo_existencia y unidad_medida
        producto = await self.producto_repo.update(
            producto_id       = producto_id,
            descripcion       = data.descripcion,
            codigo_existencia = data.codigo_existencia,
            unidad_medida     = data.unidad_medida,
        )
        if not producto:
            raise KardexException(f"Producto #{producto_id} no encontrado.", status_code=404)

        return ProductoResponse.model_validate(producto)

    # ── Eliminar ──────────────────────────────────────────────────────────────
    async def eliminar(self, producto_id: int) -> dict:
        """
        Solo permite eliminar si el producto no tiene movimientos.
        Un producto con movimientos no puede borrarse — implicaría
        borrar historial contable.
        """
        total_mov = await self.producto_repo.count_movimientos(producto_id)
        if total_mov > 0:
            raise KardexException(
                f"No se puede eliminar el producto #{producto_id} porque tiene "
                f"{total_mov} movimiento(s) registrado(s). "
                f"Elimina primero los procesamientos asociados.",
                status_code=409,
            )

        eliminado = await self.producto_repo.delete(producto_id)
        if not eliminado:
            raise KardexException(f"Producto #{producto_id} no encontrado.", status_code=404)

        return {"mensaje": f"Producto #{producto_id} eliminado correctamente."}