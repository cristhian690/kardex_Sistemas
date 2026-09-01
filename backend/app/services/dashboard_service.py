
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, desc, case
from app.models.procesamiento import Procesamiento
from app.models.movimiento import Movimiento
from app.models.producto import Producto
from app.schemas.dashboard import (
    DashboardMetricas, 
    EvolucionDia, 
    TopIncidencia, 
    ArchivoReciente
)
from datetime import datetime

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_metricas(self) -> DashboardMetricas:
        # 1. EVOLUCIÓN: Procesamientos por fecha (últimos 7 días activos)
        query_evolucion = (
            select(
                cast(Procesamiento.creado_en, Date).label("fecha_dia"),
                func.count(Procesamiento.id).label("total")
            )
            .group_by(cast(Procesamiento.creado_en, Date))
            .order_by(desc(cast(Procesamiento.creado_en, Date)))
            .limit(7)
        )
        res_evolucion = await self.db.execute(query_evolucion)
        filas_ev = res_evolucion.all()[::-1]

        evolucion = [
            EvolucionDia(
                fecha=row.fecha_dia.strftime("%d %b"),
                procesados=row.total
            ) for row in filas_ev
        ]

        # 2. TOP INCIDENCIAS
        calculo_errores = (
            case((Movimiento.saldo_negativo == True, 1), else_=0) +
            case((Movimiento.error_a == True, 1), else_=0) +
            case((Movimiento.error_b == True, 1), else_=0)
        )

        query_top = (
            select(
                Producto.codigo,
                func.sum(calculo_errores).label("total_incidencias")
            )
            .join(Producto, Movimiento.producto_id == Producto.id)
            .where(
                (Movimiento.saldo_negativo == True) |
                (Movimiento.error_a == True) |
                (Movimiento.error_b == True)
            )
            .group_by(Producto.codigo)
            .order_by(desc("total_incidencias"))
            .limit(5)
        )
        res_top = await self.db.execute(query_top)

        top_incidencias = [
            TopIncidencia(codigo=row.codigo, incidencias=int(row.total_incidencias))
            for row in res_top.all()
        ]

        # 3. ÚLTIMOS ARCHIVOS
        query_archivos = (
            select(Procesamiento)
            .order_by(Procesamiento.creado_en.desc())
            .limit(4)
        )
        res_archivos = await self.db.execute(query_archivos)

        def format_time_ago(d: datetime) -> str:
            ahora = datetime.now(d.tzinfo)
            diff = ahora - d
            if diff.days == 0:
                return f"Hoy, {d.strftime('%I:%M %p')}"
            elif diff.days == 1:
                return f"Ayer, {d.strftime('%I:%M %p')}"
            return d.strftime("%d/%m/%Y, %I:%M %p")

        ultimos_archivos = [
            ArchivoReciente(
                id=p.id,
                nombre=p.nombre_archivo,
                fecha=format_time_ago(p.creado_en),
                estado=p.estado.value,
                registros=p.total_registros
            ) for p in res_archivos.scalars().all()
        ]

        return DashboardMetricas(
            evolucion=evolucion,
            top_incidencias=top_incidencias,
            ultimos_archivos=ultimos_archivos
        )