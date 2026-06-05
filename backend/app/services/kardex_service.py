import time
import pandas as pd
from decimal import Decimal
from datetime import date, datetime
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

# FIX: límite seguro para Numeric(18,6)
MAX_VAL = 999999999999.0

def _clamp(v: float) -> float:
    """Limita valores extremos para evitar desbordamiento en BD."""
    if v != v:  # NaN check
        return 0.0
    return max(-MAX_VAL, min(MAX_VAL, v))


# ✅ NUEVO: helper extraído para no duplicar el bloque MovimientoResponse
def _build_fila_saldo_inicial(
    procesamiento_id: int,
    codigo: str,
    fecha: date,
    saldo_cant: Decimal,
    saldo_total: Decimal,
) -> MovimientoResponse:
    """Construye la fila de saldo inicial para cualquier modo de filtro."""
    return MovimientoResponse(
        id                   = 0,
        procesamiento_id     = procesamiento_id,
        producto_id          = 0,
        codigo               = codigo,
        fecha                = fecha,
        tipo_comprobante     = 0,
        serie                = "",
        numero               = "",
        tipo_operacion       = "SALDO INICIAL",
        ent_cantidad         = Decimal("0"),
        ent_costo_unit       = Decimal("0"),
        ent_costo_total      = Decimal("0"),
        sal_cantidad         = Decimal("0"),
        sal_costo_unit       = Decimal("0"),
        sal_costo_total      = Decimal("0"),
        saldo_cantidad       = saldo_cant,
        saldo_costo_unit     = Decimal("0"),
        saldo_costo_total    = saldo_total,
        orig_ent_costo_unit  = Decimal("0"),
        orig_ent_costo_total = Decimal("0"),
        orig_sal_costo_unit  = Decimal("0"),
        orig_sal_costo_total = Decimal("0"),
        saldo_negativo       = False,
        error_a              = False,
        error_b              = False,
        semaforo             = "🟢",
        fila                 = 0,
        creado_en            = datetime.now(),
        es_saldo_inicial     = True,
    )


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
        saldo_bytes:  bytes | None,
        archivos_mov: list[tuple[str, bytes]],
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
        # ✅ CAMBIO: distingue "error" (saldo negativo) de "con_alertas" (alertas leves)
        tiene_saldo_negativo = len(alertas.saldo_negativo) > 0
        tiene_alertas_leves  = (
            len(alertas.sin_saldo_inicial) > 0 or
            int((df_all["Semaforo"] != "🟢").sum()) > 0
        )

        if tiene_saldo_negativo:
            estado = "error"
        elif tiene_alertas_leves:
            estado = "con_alertas"
        else:
            estado = "procesado"

        # ── 7. Persistir en BD ────────────────────────────────────────────────
        t0 = time.time()

        archivos   = [f for f, _ in archivos_mov]
        total_arch = len(archivos)
        if total_arch == 1:
            nombre_archivo = archivos[0]
        elif total_arch <= 3:
            nombre_archivo = ", ".join(archivos)
        else:
            nombre_archivo = f"{archivos[0]}, {archivos[1]} y {total_arch - 2} archivos más"

        procesamiento = await self.procesamiento_repo.crear(
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

        # ── Saldo inicial del periodo ─────────────────────────────────────────
        fila_saldo_inicial = None
        codigos_distintos  = list({m.producto.codigo for m in movimientos if m.producto})
        codigo_saldo       = filtros.codigo or (codigos_distintos[0] if len(codigos_distintos) == 1 else None)

        # ✅ CAMBIO: MODO AÑO/MES — primer día del mes seleccionado
        if filtros.anio and filtros.mes and codigo_saldo:
            antes_de = date(filtros.anio, filtros.mes, 1)
            mov_anterior = await self.movimiento_repo.get_saldo_anterior(
                procesamiento_id = procesamiento_id,
                codigo           = codigo_saldo,
                antes_de         = antes_de,
            )
            saldo_cant  = Decimal(str(mov_anterior.saldo_cantidad))    if mov_anterior else Decimal("0")
            saldo_total = Decimal(str(mov_anterior.saldo_costo_total)) if mov_anterior else Decimal("0")
            fila_saldo_inicial = _build_fila_saldo_inicial(
                procesamiento_id, codigo_saldo, antes_de, saldo_cant, saldo_total
            )

        # ✅ NUEVO: MODO RANGO — primer día del rango seleccionado
        elif fecha_desde and codigo_saldo:
            mov_anterior = await self.movimiento_repo.get_saldo_anterior(
                procesamiento_id = procesamiento_id,
                codigo           = codigo_saldo,
                antes_de         = fecha_desde,
            )
            saldo_cant  = Decimal(str(mov_anterior.saldo_cantidad))    if mov_anterior else Decimal("0")
            saldo_total = Decimal(str(mov_anterior.saldo_costo_total)) if mov_anterior else Decimal("0")
            fila_saldo_inicial = _build_fila_saldo_inicial(
                procesamiento_id, codigo_saldo, fecha_desde, saldo_cant, saldo_total
            )

        # ── Validar que haya algo que mostrar ─────────────────────────────────
        if not movimientos and fila_saldo_inicial is None:
            raise KardexException("No se encontraron movimientos con los filtros aplicados.")

        # ── Métricas (solo sobre movimientos reales, no el saldo inicial) ─────
        if movimientos:
            df_filtrado = pd.DataFrame([{
                "Ent_Cantidad":      float(m.ent_cantidad),
                "Ent_Costo_Total":   float(m.ent_costo_total),
                "Sal_Cantidad":      float(m.sal_cantidad),
                "Sal_Costo_Total":   float(m.sal_costo_total),
                "Saldo_Cantidad":    float(m.saldo_cantidad),
                "Saldo_Costo_Total": float(m.saldo_costo_total),
            } for m in movimientos])
            metricas_dict = calcular_metricas(df_filtrado)
        else:
            metricas_dict = calcular_metricas(pd.DataFrame(columns=[
                "Ent_Cantidad", "Ent_Costo_Total",
                "Sal_Cantidad", "Sal_Costo_Total",
                "Saldo_Cantidad", "Saldo_Costo_Total",
            ]))

        alertas_dict = procesamiento.alertas or {}

        def calcular_semaforo(m) -> str:
            if m.saldo_negativo:
                return "🔴"
            if m.error_a and m.error_b:
                return "⚫"
            elif m.error_a:
                return "🔴"
            elif m.error_b:
                return "🟡"
            return "🟢"

        def es_costo_reconstruido(m) -> bool:
            tipo = (m.tipo_operacion or "").lower()
            if "venta" not in tipo:
                return False
            return (
                float(m.orig_sal_costo_unit) == 0
                and float(m.sal_costo_unit) > 0
            )

        movimientos_response = [
            MovimientoResponse(
                **{c.key: getattr(m, c.key) for c in m.__table__.columns},
                codigo             = m.producto.codigo if m.producto else None,
                semaforo           = calcular_semaforo(m),
                fila               = idx + 1,
                costo_reconstruido = es_costo_reconstruido(m),
            )
            for idx, m in enumerate(movimientos)
        ]

        if fila_saldo_inicial:
            movimientos_response.insert(0, fila_saldo_inicial)

        errores = sum(1 for r in movimientos_response if r.semaforo != "🟢")

        return KardexResponse(
            procesamiento_id   = procesamiento_id,
            codigo             = filtros.codigo or "TODOS",
            total_registros    = len(movimientos_response),
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
        result = await self.db.execute(
            select(SaldoInicial, Producto)
            .join(Producto, SaldoInicial.producto_id == Producto.id)
        )
        saldos = {}
        for saldo, producto in result.all():
            saldos[producto.codigo] = {
                "fecha":          saldo.fecha,
                "cantidad":       saldo.cantidad,
                "costo_unitario": saldo.costo_unitario,
                "costo_total":    saldo.costo_total,
            }
        return saldos

    async def _persistir_saldos_iniciales(self, saldos: dict) -> None:
        from datetime import date as date_type

        codigos = list(saldos.keys())
        productos_map = await self.producto_repo.get_or_create_bulk(codigos)

        for codigo, datos in saldos.items():
            producto = productos_map[codigo]
            fecha = datos.get("fecha") or date_type.today()
            await self.saldo_repo.upsert(
                producto_id    = producto.id,
                fecha          = fecha,
                cantidad       = Decimal(str(datos["cantidad"])),
                costo_unitario = Decimal(str(datos["costo_unitario"])),
                costo_total    = Decimal(str(datos["costo_total"])),
            )

    async def _persistir_movimientos(self, df: pd.DataFrame, procesamiento_id: int) -> None:
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
                "ent_cantidad":     _clamp(float(row.Ent_Cantidad)),
                "ent_costo_unit":   _clamp(float(row.Ent_Costo_Unit)),
                "ent_costo_total":  _clamp(float(row.Ent_Costo_Total)),
                "sal_cantidad":     _clamp(float(row.Sal_Cantidad)),
                "sal_costo_unit":   _clamp(float(row.Sal_Costo_Unit)),
                "sal_costo_total":  _clamp(float(row.Sal_Costo_Total)),
                "saldo_cantidad":   _clamp(float(row.Saldo_Cantidad)),
                "saldo_costo_unit": _clamp(float(row.Saldo_Costo_Unit)),
                "saldo_costo_total":_clamp(float(row.Saldo_Costo_Total)),
                "orig_ent_costo_unit":  _clamp(float(row.Orig_Ent_Costo_Unit)),
                "orig_ent_costo_total": _clamp(float(row.Orig_Ent_Costo_Total)),
                "orig_sal_costo_unit":  _clamp(float(row.Orig_Sal_Costo_Unit)),
                "orig_sal_costo_total": _clamp(float(row.Orig_Sal_Costo_Total)),
                "saldo_negativo": bool(row.Saldo_Negativo),
                "error_a":        bool(row.Error_A),
                "error_b":        bool(row.Error_B),
            })

        await self.movimiento_repo.crear_bulk(registros)