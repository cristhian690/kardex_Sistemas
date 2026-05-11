import time
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories import (
    ProductoRepository,
    SaldoRepository,
    ProcesamientoRepository,
    MovimientoRepository,
)
from app.models.producto import Producto
from app.models.saldo_inicial import SaldoInicial
from app.services.kardex_engine import (
    parsear_saldos_iniciales,
    parsear_movimientos,
    detectar_duplicados,
    calcular_saldo_final,
    verificar_integridad,
    calcular_metricas,
)
from app.schemas.kardex import KardexResponse, UploadResponse, FiltroKardex, MetricasKardex
from app.schemas.procesamiento import AlertasProcesamiento, ProcesamientoResumen
from app.schemas.movimiento import MovimientoResponse
from app.exceptions import KardexException
from datetime import date


class KardexService:

    def __init__(self, db: AsyncSession):
        self.db                    = db
        self.producto_repo         = ProductoRepository(db)
        self.saldo_repo            = SaldoRepository(db)
        self.procesamiento_repo    = ProcesamientoRepository(db)
        self.movimiento_repo       = MovimientoRepository(db)

    # ── Carga y procesamiento de archivos ─────────────────────────────────────
    async def procesar_archivos(
        self,
        saldo_bytes:      bytes | None,
        archivos_mov:     list[tuple[str, bytes]],
    ) -> UploadResponse:
        inicio_total = time.time()

        # ── 1. Parsear saldos iniciales ───────────────────────────────────────
        t0 = time.time()
        saldos_iniciales = {}

        if saldo_bytes:
            saldos_iniciales = parsear_saldos_iniciales(saldo_bytes)
            await self._persistir_saldos_iniciales(saldos_iniciales)
        else:
            saldos_iniciales = await self._cargar_saldos_desde_bd()
        print(f"⏱️  [1] Saldos iniciales: {time.time() - t0:.2f}s")

        # ── 2. Parsear movimientos ────────────────────────────────────────────
        t0 = time.time()
        frames = {}
        for filename, file_bytes in archivos_mov:
            df, error = parsear_movimientos(file_bytes, filename)
            if error:
                raise KardexException(error)
            frames[filename] = df
        print(f"⏱️  [2] Parseo Excel: {time.time() - t0:.2f}s")

        # ── 3. Detectar duplicados ────────────────────────────────────────────
        duplicados = detectar_duplicados(frames)
        if duplicados:
            codigos = list(duplicados.keys())
            raise KardexException(
                f"Códigos duplicados en múltiples archivos: {', '.join(codigos)}"
            )

        # ── 4. Unir y calcular ────────────────────────────────────────────────
        t0 = time.time()
        df_all = pd.concat(frames.values(), ignore_index=True)
        df_all, alertas = calcular_saldo_final(df_all, saldos_iniciales)
        print(f"⏱️  [4] Cálculo saldo: {time.time() - t0:.2f}s")

        # ── 5. Verificar integridad ───────────────────────────────────────────
        t0 = time.time()
        df_all = verificar_integridad(df_all)
        print(f"⏱️  [5] Verificación: {time.time() - t0:.2f}s")

        # ── 6. Determinar estado ──────────────────────────────────────────────
        tiene_alertas = (
            len(alertas.sin_saldo_inicial) > 0 or
            len(alertas.saldo_negativo) > 0 or
            int((df_all["Semaforo"] != "🟢").sum()) > 0
        )
        estado = "con_alertas" if tiene_alertas else "procesado"

        # ── 7. Persistir en BD ────────────────────────────────────────────────
        t0 = time.time()
        nombre_archivo = ", ".join([f for f, _ in archivos_mov])
        procesamiento  = await self.procesamiento_repo.crear(
            nombre_archivo       = nombre_archivo,
            total_registros      = len(df_all),
            productos_procesados = df_all["Codigo"].nunique(),
            estado               = estado,
            alertas              = alertas.model_dump(),
        )
        print(f"⏱️  [7a] Crear procesamiento: {time.time() - t0:.2f}s")

        t0 = time.time()
        await self._persistir_movimientos(df_all, procesamiento.id)
        print(f"⏱️  [7b] Persistir movimientos: {time.time() - t0:.2f}s")

        print(f"✅ TOTAL: {time.time() - inicio_total:.2f}s para {len(df_all)} registros")

        return UploadResponse(
            procesamiento_id     = procesamiento.id,
            total_registros      = len(df_all),
            productos_procesados = df_all["Codigo"].nunique(),
            estado               = estado,
            alertas              = alertas,
        )

    # ── Consulta del kardex con filtros ───────────────────────────────────────
    async def get_kardex(
        self,
        procesamiento_id: int,
        filtros:          FiltroKardex,
    ) -> KardexResponse:
        procesamiento = await self.procesamiento_repo.get_by_id(procesamiento_id)
        if not procesamiento:
            raise KardexException(f"Procesamiento {procesamiento_id} no encontrado.")

        fecha_exacta = date.fromisoformat(filtros.fecha_exacta) if filtros.fecha_exacta else None
        fecha_desde  = date.fromisoformat(filtros.fecha_desde)  if filtros.fecha_desde  else None
        fecha_hasta  = date.fromisoformat(filtros.fecha_hasta)  if filtros.fecha_hasta  else None

        movimientos = await self.movimiento_repo.get_filtrado(
            procesamiento_id = procesamiento_id,
            codigo           = filtros.codigo,
            anio             = filtros.anio,
            mes              = filtros.mes,
            fecha_exacta     = fecha_exacta,
            fecha_desde      = fecha_desde,
            fecha_hasta      = fecha_hasta,
        )

        if not movimientos:
            raise KardexException("No se encontraron movimientos con los filtros aplicados.")

        df_filtrado = pd.DataFrame([{
            "Ent_Cantidad":      float(m.ent_cantidad),
            "Ent_Costo_Total":   float(m.ent_costo_total),
            "Sal_Cantidad":      float(m.sal_cantidad),
            "Sal_Costo_Total":   float(m.sal_costo_total),
            "Saldo_Cantidad":    float(m.saldo_cantidad),
            "Saldo_Costo_Total": float(m.saldo_costo_total),
        } for m in movimientos])

        metricas_dict = calcular_metricas(df_filtrado)
        alertas_dict  = procesamiento.alertas or {}

        def calcular_semaforo(m) -> str:
            if m.error_a and m.error_b:
                return "⚫"
            elif m.error_a:
                return "🔴"
            elif m.error_b:
                return "🟡"
            return "🟢"

        movimientos_response = [
            MovimientoResponse(
                **{c.key: getattr(m, c.key) for c in m.__table__.columns},
                codigo   = m.producto.codigo if m.producto else None,
                semaforo = calcular_semaforo(m),
                fila     = idx + 1,
            )
            for idx, m in enumerate(movimientos)
        ]

        errores = sum(1 for r in movimientos_response if r.semaforo != "🟢")

        return KardexResponse(
            procesamiento_id   = procesamiento_id,
            codigo             = filtros.codigo or "TODOS",
            total_registros    = len(movimientos),
            errores_integridad = errores,
            alertas            = AlertasProcesamiento(**alertas_dict),
            metricas           = MetricasKardex(**metricas_dict),
            movimientos        = movimientos_response,
        )

    # ── Historial de procesamientos ───────────────────────────────────────────
    async def get_historial(self, limit: int = 20, offset: int = 0) -> list[ProcesamientoResumen]:
        procesamientos = await self.procesamiento_repo.get_historial(limit=limit, offset=offset)
        return [ProcesamientoResumen.model_validate(p) for p in procesamientos]

    # ── Helpers privados ──────────────────────────────────────────────────────
    async def _cargar_saldos_desde_bd(self) -> dict:
        """
        🚀 OPTIMIZADO: una sola query con JOIN, sin N+1.
        """
        result = await self.db.execute(
            select(SaldoInicial, Producto)
            .join(Producto, SaldoInicial.producto_id == Producto.id)
        )
        saldos = {}
        for saldo, producto in result.all():
            saldos[producto.codigo] = {
                "fecha":          saldo.fecha,
                "cantidad":       float(saldo.cantidad),
                "costo_unitario": float(saldo.costo_unitario),
                "costo_total":    float(saldo.costo_total),
            }
        return saldos

    async def _persistir_saldos_iniciales(self, saldos: dict) -> None:
        """
        🚀 OPTIMIZADO: trae todos los productos en una sola query.
        """
        from datetime import date as date_type

        codigos = list(saldos.keys())
        productos_map = await self.producto_repo.get_or_create_bulk(codigos)

        for codigo, datos in saldos.items():
            producto = productos_map[codigo]
            fecha = datos.get("fecha") or date_type.today()
            await self.saldo_repo.upsert(
                producto_id    = producto.id,
                fecha          = fecha,
                cantidad       = datos["cantidad"],
                costo_unitario = datos["costo_unitario"],
                costo_total    = datos["costo_total"],
            )

    async def _persistir_movimientos(self, df: pd.DataFrame, procesamiento_id: int) -> None:
        """
        🚀 OPTIMIZADO:
        - Trae todos los productos en UNA sola query (en vez de uno por fila)
        - Usa itertuples (10x más rápido que iterrows)
        """
        # Cache de productos: 1 sola query para todos los códigos
        codigos_unicos = df["Codigo"].astype(str).str.strip().unique().tolist()
        productos_map  = await self.producto_repo.get_or_create_bulk(codigos_unicos)

        registros = []

        for row in df.itertuples(index=False):
            codigo   = str(row.Codigo).strip()
            producto = productos_map[codigo]

            numero_val = str(row.Numero).strip()
            try:
                numero_val = str(int(float(numero_val))) if numero_val not in ("", "nan") else "0"
            except Exception:
                numero_val = "0"

            registros.append({
                "producto_id":      producto.id,
                "procesamiento_id": procesamiento_id,
                "fecha":            row.Fecha.date() if pd.notna(row.Fecha) else None,
                "tipo_comprobante": int(row.Tipo) if pd.notna(row.Tipo) else 0,
                "serie":            str(row.Serie),
                "numero":           numero_val,
                "tipo_operacion":   str(row.Tipo_Operacion),
                # Entradas
                "ent_cantidad":     float(row.Ent_Cantidad),
                "ent_costo_unit":   float(row.Ent_Costo_Unit),
                "ent_costo_total":  float(row.Ent_Costo_Total),
                # Salidas
                "sal_cantidad":     float(row.Sal_Cantidad),
                "sal_costo_unit":   float(row.Sal_Costo_Unit),
                "sal_costo_total":  float(row.Sal_Costo_Total),
                # Saldo calculado
                "saldo_cantidad":   float(row.Saldo_Cantidad),
                "saldo_costo_unit": float(row.Saldo_Costo_Unit),
                "saldo_costo_total":float(row.Saldo_Costo_Total),
                # Originales del Excel
                "orig_ent_costo_unit":  float(row.Orig_Ent_Costo_Unit),
                "orig_ent_costo_total": float(row.Orig_Ent_Costo_Total),
                "orig_sal_costo_unit":  float(row.Orig_Sal_Costo_Unit),
                "orig_sal_costo_total": float(row.Orig_Sal_Costo_Total),
                # Flags
                "saldo_negativo": bool(row.Saldo_Negativo),
                "error_a":        bool(row.Error_A),
                "error_b":        bool(row.Error_B),
            })

        await self.movimiento_repo.crear_bulk(registros)