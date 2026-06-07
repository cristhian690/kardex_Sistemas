from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.repositories import ProductoRepository
from app.models.movimiento import Movimiento
from app.schemas.producto import ProductoResponse, ProductoConEstadisticas, ProductoUpdate, ProductoCreate
from app.exceptions import KardexException


class ProductoService:

    def __init__(self, db: AsyncSession):
        self.db            = db
        self.producto_repo = ProductoRepository(db)

    
    # ── Método para crear productos manualmente ────────────────────────
    async def crear(self, data: ProductoCreate) -> ProductoResponse:
        # Forzamos formato estándar limpio
        codigo_limpio = data.codigo.strip().upper()

        # Validamos restricción UniqueConstraint(empresa_id, codigo)
        existente = await self.producto_repo.get_by_codigo_y_empresa(codigo_limpio, data.empresa_id)
        if existente:
            raise KardexException(
                f"El código de producto '{codigo_limpio}' ya está registrado en esa empresa.",
                status_code=400
            )

        producto = await self.producto_repo.crear(
            codigo=codigo_limpio,
            empresa_id=data.empresa_id,
            descripcion=data.descripcion.strip() if data.descripcion else None,
            codigo_existencia=data.codigo_existencia.strip() if data.codigo_existencia else None,
            unidad_medida=data.unidad_medida.strip() if data.unidad_medida else None,
        )

        # FIX ABSOLUTO: Clonamos los campos planos del producto en un diccionario 
        # y le inyectamos manualmente la lista vacía de saldos.
        # Al pasarle un diccionario puro a Pydantic, SQLAlchemy queda fuera del juego.
        producto_dict = {
            "id": producto.id,
            "empresa_id": producto.empresa_id,
            "codigo": producto.codigo,
            "descripcion": producto.descripcion,
            "codigo_existencia": producto.codigo_existencia,
            "unidad_medida": producto.unidad_medida,
            "creado_en": producto.creado_en,
            "saldos_iniciales": [] # Sabes con certeza que está vacío
        }

        return ProductoResponse.model_validate(producto_dict)
    
    
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
        
        # 1. Obtener el estado actual del producto para saber su código y empresa actuales
        producto_actual = await self.producto_repo.get_by_id(producto_id)
        if not producto_actual:
            raise KardexException(f"Producto #{producto_id} no encontrado.", status_code=404)

        # 2. NUEVO: Validar colisión de códigos si se está cambiando de empresa
        if data.empresa_id is not None and data.empresa_id != producto_actual.empresa_id:
            existente_destino = await self.producto_repo.get_by_codigo_y_empresa(
                producto_actual.codigo, 
                data.empresa_id
            )
            if existente_destino:
                raise KardexException(
                    f"No se puede reasignar el producto. El código '{producto_actual.codigo}' "
                    f"ya existe en la empresa destino.",
                    status_code=400
                )

        # 3. Proceder con la actualización en el repositorio si todo está limpio
        producto = await self.producto_repo.update(
            producto_id       = producto_id,
            empresa_id        = data.empresa_id,
            descripcion       = data.descripcion,
            codigo_existencia = data.codigo_existencia,
            unidad_medida     = data.unidad_medida,
        )

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