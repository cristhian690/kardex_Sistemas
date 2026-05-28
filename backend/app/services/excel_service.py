import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories import MovimientoRepository, ProcesamientoRepository
from app.utils.excel_exporter import exportar_kardex_excel
from app.exceptions import KardexException
from datetime import date


class ExcelService:

    def __init__(self, db: AsyncSession):
        self.db                 = db
        self.movimiento_repo    = MovimientoRepository(db)
        self.procesamiento_repo = ProcesamientoRepository(db)

    async def exportar(
        self,
        procesamiento_id: int,
        codigo:           str | None  = None,
        fecha_desde:      date | None = None,
        fecha_hasta:      date | None = None,
    ) -> bytes:
        procesamiento = await self.procesamiento_repo.get_by_id(procesamiento_id)
        if not procesamiento:
            raise KardexException(f"Procesamiento {procesamiento_id} no encontrado.")

        movimientos = await self.movimiento_repo.get_filtrado(
            procesamiento_id = procesamiento_id,
            codigo           = codigo,
            fecha_desde      = fecha_desde,
            fecha_hasta      = fecha_hasta,
        )

        if not movimientos:
            raise KardexException("No hay movimientos para exportar con los filtros aplicados.")

        # ── Saldo inicial (solo cuando hay fecha_desde y un único código) ────
        filas = []
        if fecha_desde:
            codigos_distintos = list({m.producto.codigo for m in movimientos if m.producto})
            codigo_saldo = codigo or (codigos_distintos[0] if len(codigos_distintos) == 1 else None)

            if codigo_saldo:
                mov_anterior = await self.movimiento_repo.get_saldo_anterior(
                    procesamiento_id = procesamiento_id,
                    codigo           = codigo_saldo,
                    antes_de         = fecha_desde,
                )
                saldo_cant  = float(mov_anterior.saldo_cantidad)    if mov_anterior else 0.0
                saldo_total = float(mov_anterior.saldo_costo_total) if mov_anterior else 0.0

                filas.append({
                    "Codigo":           codigo_saldo,
                    "Fecha":            fecha_desde,
                    "Tipo":             "",
                    "Serie":            "",
                    "Numero":           "",
                    "Tipo_Operacion":   "SALDO INICIAL",
                    "Ent_Cantidad":     0.0,
                    "Ent_Costo_Unit":   0.0,
                    "Ent_Costo_Total":  0.0,
                    "Sal_Cantidad":     0.0,
                    "Sal_Costo_Unit":   0.0,
                    "Sal_Costo_Total":  0.0,
                    "Saldo_Cantidad":   saldo_cant,
                    "Saldo_Costo_Unit": 0.0,
                    "Saldo_Costo_Total":saldo_total,
                })

        # ── Movimientos reales ────────────────────────────────────────────────
        for m in movimientos:
            filas.append({
                "Codigo":           m.producto.codigo if m.producto else "",
                "Fecha":            m.fecha,
                "Tipo":             m.tipo_comprobante,
                "Serie":            m.serie,
                "Numero":           m.numero,
                "Tipo_Operacion":   m.tipo_operacion,
                "Ent_Cantidad":     float(m.ent_cantidad),
                "Ent_Costo_Unit":   float(m.ent_costo_unit),
                "Ent_Costo_Total":  float(m.ent_costo_total),
                "Sal_Cantidad":     float(m.sal_cantidad),
                "Sal_Costo_Unit":   float(m.sal_costo_unit),
                "Sal_Costo_Total":  float(m.sal_costo_total),
                "Saldo_Cantidad":   float(m.saldo_cantidad),
                "Saldo_Costo_Unit": float(m.saldo_costo_unit),
                "Saldo_Costo_Total":float(m.saldo_costo_total),
            })

        df = pd.DataFrame(filas)
        return exportar_kardex_excel(df)