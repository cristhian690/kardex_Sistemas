import io
import pandas as pd

from decimal import (
    Decimal,
    ROUND_HALF_UP,
    InvalidOperation,
)
from app.schemas.procesamiento import AlertasProcesamiento

# ── Configuración Decimal ─────────────────────────────────────────────────────
DECIMAL_PLACES = Decimal("0.0000000001")  # 10 decimales
ZERO = Decimal("0")
TOLERANCIA = Decimal("0.01")

# ── Tipos de operación válidos ────────────────────────────────────────────────
TIPOS_OPERACION_VALIDOS = {
    "01 venta",
    "02 compra",
    "05 devolución recibida",
    "06 devolución entregada",   # ✅ NUEVO
}

# ── Mapeo ENUM BD ─────────────────────────────────────────────────────────────
TIPO_OP_MAP = {
    "01 venta": "01 Venta",
    "02 compra": "02 Compra",
    "05 devolución recibida": "05 Devolucion Recibida",
    "06 devolución entregada": "06 Devolucion Entregada",   # ✅ NUEVO
}


# ── Helpers Decimal ───────────────────────────────────────────────────────────
def d(value) -> Decimal:
    """
    Convierte cualquier valor a Decimal seguro.
    Nunca retorna float.
    """
    try:
        if value is None or pd.isna(value):
            return ZERO

        value_str = str(value).strip()

        if value_str == "":
            return ZERO

        return Decimal(value_str).quantize(DECIMAL_PLACES, rounding=ROUND_HALF_UP)

    except (InvalidOperation, ValueError, TypeError):
        return ZERO


def q(value: Decimal) -> Decimal:
    """
    Normaliza precisión Decimal.
    """
    return Decimal(value).quantize(DECIMAL_PLACES, rounding=ROUND_HALF_UP)


# ── Validación de fila ────────────────────────────────────────────────────────
def es_fila_valida(codigo: str, fecha, tipo_op: str) -> bool:
    if pd.isna(fecha):
        return False

    if not codigo or str(codigo).strip() == "":
        return False

    if str(tipo_op).strip().lower() not in TIPOS_OPERACION_VALIDOS:
        return False

    return True


# ── Detectar offset ───────────────────────────────────────────────────────────
def _detectar_offset(df_raw: pd.DataFrame) -> int:

    if len(df_raw.columns) < 2:
        return 0

    for i in range(min(30, len(df_raw))):
        codigo_a = df_raw.iloc[i, 0] if pd.notna(df_raw.iloc[i, 0]) else None
        valor_b = df_raw.iloc[i, 1] if len(df_raw.columns) > 1 else None

        if pd.isna(codigo_a):
            continue

        codigo_str = str(codigo_a).strip()

        if codigo_str.lower() in ("codigo", "código"):
            continue

        if len(codigo_str) > 30:
            continue

        if pd.isna(valor_b):
            continue

        fecha_test = pd.to_datetime(valor_b, errors="coerce", dayfirst=True)

        if pd.notna(fecha_test):
            return 0

        valor_str = str(valor_b).strip()
        if valor_str:

            cleaned = (
                valor_str.replace(".", "")
                .replace(",", "")
                .replace("-", "")
                .replace(" ", "")
            )

            if not cleaned.isdigit():
                return 1

    return 0


# ── Parsear saldos iniciales ──────────────────────────────────────────────────
def parsear_saldos_iniciales(file_bytes: bytes) -> dict:
    df = pd.read_excel(
        io.BytesIO(file_bytes), header=None, dtype={0: str, 3: str, 4: str, 5: str}
    )

    saldos = {}

    for _, row in df.iterrows():
        codigo = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        tipo_op = str(row.iloc[2]).strip().lower() if pd.notna(row.iloc[2]) else ""

        if not codigo or "saldo" not in tipo_op:
            continue

        try:
            fecha_raw = row.iloc[1]

            if pd.isna(fecha_raw):
                fecha = None

            elif isinstance(fecha_raw, str):
                fecha = pd.to_datetime(fecha_raw, dayfirst=True, errors="coerce")
                fecha = fecha.date() if pd.notna(fecha) else None

            else:
                fecha = pd.to_datetime(fecha_raw, errors="coerce")
                fecha = fecha.date() if pd.notna(fecha) else None

            cantidad = d(row.iloc[3])
            costo_unitario = d(row.iloc[4])
            costo_total = d(row.iloc[5])

            # recalcular si viene vacío
            if costo_total == ZERO:
                costo_total = q(cantidad * costo_unitario)

        except Exception:
            continue

        saldos[codigo] = {
            "fecha": fecha,
            "cantidad": cantidad,
            "costo_unitario": costo_unitario,
            "costo_total": costo_total,
        }
    return saldos


# ── Parsear movimientos ───────────────────────────────────────────────────────
def parsear_movimientos(
    file_bytes: bytes,
    filename: str,
) -> tuple[pd.DataFrame, str | None]:

    try:
        df_raw = pd.read_excel(io.BytesIO(file_bytes), header=None, dtype={0: str})
        offset = _detectar_offset(df_raw)

        IDX_CODIGO = 0
        IDX_FECHA = 1 + offset
        IDX_TIPO = 2 + offset
        IDX_SERIE = 3 + offset
        IDX_NUMERO = 4 + offset
        IDX_TIPO_OP = 5 + offset
        IDX_ENT_CANT = 6 + offset
        IDX_ENT_UNIT = 7 + offset
        IDX_ENT_TOT = 8 + offset
        IDX_SAL_CANT = 9 + offset
        IDX_SAL_UNIT = 10 + offset
        IDX_SAL_TOT = 11 + offset

        min_cols = IDX_ENT_TOT + 1

        registros = []

        for _, row in df_raw.iterrows():

            if len(row) < min_cols:
                continue

            codigo = (
                str(row.iloc[IDX_CODIGO]).strip()
                if pd.notna(row.iloc[IDX_CODIGO])
                else ""
            )

            fecha = pd.to_datetime(row.iloc[IDX_FECHA], errors="coerce", dayfirst=True)

            tipo_op = (
                str(row.iloc[IDX_TIPO_OP]).strip()
                if pd.notna(row.iloc[IDX_TIPO_OP])
                else ""
            )

            if not es_fila_valida(codigo, fecha, tipo_op):
                continue

            tipo_comp = row.iloc[IDX_TIPO]

            serie = (
                str(row.iloc[IDX_SERIE]).strip()
                if pd.notna(row.iloc[IDX_SERIE])
                else ""
            )

            numero = row.iloc[IDX_NUMERO]

            ent_cant = d(row.iloc[IDX_ENT_CANT])
            ent_unit = d(row.iloc[IDX_ENT_UNIT])
            ent_total = d(row.iloc[IDX_ENT_TOT])

            sal_cant = d(row.iloc[IDX_SAL_CANT])
            sal_unit = d(row.iloc[IDX_SAL_UNIT])
            sal_total = d(row.iloc[IDX_SAL_TOT])

            registros.append(
                {
                    "Codigo": codigo,
                    "Fecha": fecha,
                    "Tipo": tipo_comp,
                    "Serie": serie,
                    "Numero": numero,
                    "Tipo_Operacion": TIPO_OP_MAP.get(tipo_op.lower(), tipo_op),
                    "Ent_Cantidad": ent_cant,
                    "Ent_Costo_Unit": ent_unit,
                    "Ent_Costo_Total": ent_total,
                    "Sal_Cantidad": sal_cant,
                    "Sal_Costo_Unit": sal_unit,
                    "Sal_Costo_Total": sal_total,
                    "Orig_Ent_Costo_Unit": ent_unit,
                    "Orig_Ent_Costo_Total": ent_total,
                    "Orig_Sal_Costo_Unit": sal_unit,
                    "Orig_Sal_Costo_Total": sal_total,
                }
            )

        print(
            f"[parser] {filename}: "
            f"offset={offset}, "
            f"registros válidos={len(registros)}"
        )

        if not registros:
            return None, f"'{filename}' no contiene registros válidos."

        return pd.DataFrame(registros), None

    except Exception as e:
        return None, f"Error al leer '{filename}': {str(e)}"


# ── Duplicados ────────────────────────────────────────────────────────────────
def detectar_duplicados(frames: dict[str, pd.DataFrame]) -> dict[str, set]:
    codigo_a_archivo = {}
    duplicados = {}

    for nombre_archivo, df in frames.items():
        for codigo in df["Codigo"].unique():
            if codigo in codigo_a_archivo:

                if codigo not in duplicados:
                    duplicados[codigo] = {codigo_a_archivo[codigo]}

                duplicados[codigo].add(nombre_archivo)

            else:
                codigo_a_archivo[codigo] = nombre_archivo

    return duplicados


# ── Motor principal de cálculo del Kardex ─────────────────────────────────────
def calcular_saldo_final(
    df: pd.DataFrame,
    saldos_iniciales: dict,
) -> tuple[pd.DataFrame, AlertasProcesamiento]:
    """
    Recalcula completamente las columnas de Saldo Final para todos los productos.

    Reglas:
    - 01 Venta                 → SALIDA.  Costo promedio NO cambia.
    - 02 Compra                → ENTRADA. Costo promedio SE RECALCULA.
    - 05 Devolución Recibida   → ENTRADA. Costo unitario entrada = 0. Costo promedio NO cambia.
    - 06 Devolución Entregada  → SALIDA.  Costo promedio NO cambia.  ✅ NUEVO

    Todo el cálculo interno trabaja con Decimal.
    """

    from decimal import Decimal, ROUND_HALF_UP

    DECIMAL_PLACES = Decimal("0.0000000001")
    ZERO = Decimal("0")

    def q(value: Decimal) -> Decimal:
        return value.quantize(DECIMAL_PLACES, rounding=ROUND_HALF_UP)

    def d(value) -> Decimal:
        if value is None:
            return ZERO

        if isinstance(value, Decimal):
            return q(value)

        try:
            if pd.isna(value):
                return ZERO
        except Exception:
            pass

        return q(Decimal(str(value)))

    df = df.copy()

    # Inicializar columnas
    df["Saldo_Cantidad"] = ZERO
    df["Saldo_Costo_Unit"] = ZERO
    df["Saldo_Costo_Total"] = ZERO
    df["Sin_Saldo_Inicial"] = False
    df["Saldo_Negativo"] = False

    # Ordenar:
    # compras antes que ventas el mismo día
    df["_orden_op"] = df["Tipo_Operacion"].apply(
        lambda x: 0 if "compra" in str(x).lower() else 1
    )

    df = df.sort_values(["Codigo", "Fecha", "_orden_op"]).reset_index(drop=True)

    df = df.drop(columns=["_orden_op"])

    codigos_sin_saldo = []
    codigos_negativos = []

    for codigo in df["Codigo"].unique():

        mask = df["Codigo"] == codigo
        indices = list(df[mask].index)

        saldo_ini = saldos_iniciales.get(codigo)

        # ── Saldo inicial ──────────────────────────────────────────────
        if saldo_ini:
            s_cant = d(saldo_ini["cantidad"])
            s_unit = d(saldo_ini["costo_unitario"])
            s_total = d(saldo_ini["costo_total"])
        else:
            s_cant = ZERO
            s_unit = ZERO
            s_total = ZERO

            df.loc[mask, "Sin_Saldo_Inicial"] = True
            codigos_sin_saldo.append(codigo)

        tiene_negativo = False

        # ── Procesar movimientos ───────────────────────────────────────
        for idx in indices:

            tipo_op = str(df.at[idx, "Tipo_Operacion"]).strip().lower()

            # ✅ DEVOLUCIÓN ENTREGADA (06) — al proveedor, SALE del almacén
            # IMPORTANTE: evaluar ANTES que "venta" y "devolu" porque contiene "entregada"
            if "devolu" in tipo_op and "entreg" in tipo_op:

                sal_cant = d(df.at[idx, "Sal_Cantidad"])
                sal_unit = d(df.at[idx, "Orig_Sal_Costo_Unit"])
                sal_total = q(sal_cant * sal_unit)

                df.at[idx, "Sal_Costo_Unit"] = sal_unit
                df.at[idx, "Sal_Costo_Total"] = sal_total

                s_cant = q(s_cant - sal_cant)
                s_total = q(s_total - sal_total)

                # El costo promedio NO cambia (es una devolución de algo ya comprado)
                if s_cant < ZERO:
                    df.at[idx, "Saldo_Negativo"] = True
                    tiene_negativo = True

            # VENTA
            elif "venta" in tipo_op:

                sal_cant = d(df.at[idx, "Sal_Cantidad"])
                sal_unit = d(df.at[idx, "Orig_Sal_Costo_Unit"])
                sal_total = q(sal_cant * sal_unit)

                df.at[idx, "Sal_Costo_Unit"] = sal_unit
                df.at[idx, "Sal_Costo_Total"] = sal_total

                s_cant = q(s_cant - sal_cant)
                s_total = q(s_total - sal_total)

                # El costo promedio NO cambia
                if s_cant < ZERO:
                    df.at[idx, "Saldo_Negativo"] = True
                    tiene_negativo = True

            # COMPRA
            elif "compra" in tipo_op:

                ent_cant = d(df.at[idx, "Ent_Cantidad"])
                ent_unit = d(df.at[idx, "Ent_Costo_Unit"])
                ent_total = q(ent_cant * ent_unit)
                df.at[idx, "Ent_Costo_Total"] = ent_total

                s_cant = q(s_cant + ent_cant)
                s_total = q(s_total + ent_total)

                if s_cant != ZERO:
                    s_unit = q(s_total / s_cant)
                else:
                    s_unit = ZERO

            # DEVOLUCIÓN RECIBIDA (05) — del cliente, ENTRA al almacén
            elif "devolu" in tipo_op:

                dev_cant = d(df.at[idx, "Ent_Cantidad"])

                df.at[idx, "Ent_Costo_Unit"] = ZERO
                df.at[idx, "Ent_Costo_Total"] = ZERO

                s_cant = q(s_cant + dev_cant)

                # costo promedio NO cambia
                s_total = q(s_cant * s_unit)

            # ── Guardar saldo final ────────────────────────────────────
            df.at[idx, "Saldo_Cantidad"] = s_cant
            df.at[idx, "Saldo_Costo_Unit"] = s_unit
            df.at[idx, "Saldo_Costo_Total"] = s_total

        # ── Alertas ────────────────────────────────────────────────────
        if tiene_negativo:
            codigos_negativos.append(codigo)

    # ── Resumen de alertas ─────────────────────────────────────────────
    alertas = AlertasProcesamiento(
        sin_saldo_inicial=codigos_sin_saldo,
        saldo_negativo=codigos_negativos,
        duplicados=[],
    )

    return df, alertas


# ── Verificación de integridad ────────────────────────────────────────────────
def verificar_integridad(
    df: pd.DataFrame,
    tolerancia: Decimal = TOLERANCIA,
) -> pd.DataFrame:

    df = df.copy()

    df["Error_A"] = False
    df["Error_B"] = False
    df["Semaforo"] = "🟢"

    for idx in df.index:
        tipo_op = str(df.at[idx, "Tipo_Operacion"]).strip().lower()

        # ✅ Las devoluciones recibidas (05) no se verifican
        # porque vienen con costo 0 en el Excel original
        if "devolu" in tipo_op and "recib" in tipo_op:
            continue

        # ── Compras ────────────────────────────────────
        if "compra" in tipo_op:

            ent_cant = d(df.at[idx, "Ent_Cantidad"])
            orig_ent_unit = d(df.at[idx, "Orig_Ent_Costo_Unit"])
            orig_ent_total = d(df.at[idx, "Orig_Ent_Costo_Total"])
            calc_ent_total = d(df.at[idx, "Ent_Costo_Total"])

            # B
            expected_total = q(ent_cant * orig_ent_unit)

            if abs(expected_total - orig_ent_total) > tolerancia:
                df.at[idx, "Error_B"] = True

            # A
            if abs(calc_ent_total - orig_ent_total) > tolerancia:
                df.at[idx, "Error_A"] = True

        # ── Ventas y Devoluciones Entregadas ───────────
        # Ambas se verifican igual: salen del almacén con costo del Excel
        if "venta" in tipo_op or ("devolu" in tipo_op and "entreg" in tipo_op):

            sal_cant = d(df.at[idx, "Sal_Cantidad"])
            orig_sal_unit = d(df.at[idx, "Orig_Sal_Costo_Unit"])
            orig_sal_total = d(df.at[idx, "Orig_Sal_Costo_Total"])
            calc_sal_unit = d(df.at[idx, "Sal_Costo_Unit"])
            calc_sal_total = d(df.at[idx, "Sal_Costo_Total"])

            # B
            expected_total = q(sal_cant * orig_sal_unit)

            if abs(expected_total - orig_sal_total) > tolerancia:
                df.at[idx, "Error_B"] = True

            # A
            if abs(calc_sal_unit - orig_sal_unit) > tolerancia:
                df.at[idx, "Error_A"] = True

            if abs(calc_sal_total - orig_sal_total) > tolerancia:
                df.at[idx, "Error_A"] = True

        err_a = df.at[idx, "Error_A"]
        err_b = df.at[idx, "Error_B"]

        if err_a and err_b:
            df.at[idx, "Semaforo"] = "⚫"
        elif err_a:
            df.at[idx, "Semaforo"] = "🔴"
        elif err_b:
            df.at[idx, "Semaforo"] = "🟡"
        else:
            df.at[idx, "Semaforo"] = "🟢"

    return df


# ── Cálculo de métricas resumen ───────────────────────────────────────────────
def calcular_metricas(df: pd.DataFrame) -> dict:

    from decimal import Decimal, ROUND_HALF_UP

    DECIMAL_PLACES = Decimal("0.0000000001")
    ZERO = Decimal("0")

    def q(value: Decimal) -> Decimal:
        return value.quantize(DECIMAL_PLACES, rounding=ROUND_HALF_UP)

    def d(value) -> Decimal:

        if value is None:
            return ZERO

        if isinstance(value, Decimal):
            return q(value)

        try:
            if pd.isna(value):
                return ZERO
        except Exception:
            pass

        return q(Decimal(str(value)))

    ultima_fila = df.iloc[-1] if len(df) > 0 else None

    total_ent_cantidad = ZERO
    total_ent_costo = ZERO
    total_sal_cantidad = ZERO
    total_sal_costo = ZERO

    for value in df["Ent_Cantidad"]:
        total_ent_cantidad += d(value)

    for value in df["Ent_Costo_Total"]:
        total_ent_costo += d(value)

    for value in df["Sal_Cantidad"]:
        total_sal_cantidad += d(value)

    for value in df["Sal_Costo_Total"]:
        total_sal_costo += d(value)

    return {
        "total_ent_cantidad": float(q(total_ent_cantidad)),
        "total_ent_costo": float(q(total_ent_costo)),
        "total_sal_cantidad": float(q(total_sal_cantidad)),
        "total_sal_costo": float(q(total_sal_costo)),
        "saldo_final_cantidad": (
            float(d(ultima_fila["Saldo_Cantidad"])) if ultima_fila is not None else 0.0
        ),
        "saldo_final_costo": (
            float(d(ultima_fila["Saldo_Costo_Total"]))
            if ultima_fila is not None
            else 0.0
        ),
    }