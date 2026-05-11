import io
import pandas as pd
from decimal import Decimal
from app.schemas.procesamiento import AlertasProcesamiento


# ── Tipos de operación válidos ─────────────────────────────────────────────────
TIPOS_OPERACION_VALIDOS = {"01 venta", "02 compra", "05 devolución recibida"}
TOLERANCIA = 0.01

# ── Mapeo a valores del ENUM en BD ────────────────────────────────────────────
TIPO_OP_MAP = {
    "01 venta":               "01 Venta",
    "02 compra":              "02 Compra",
    "05 devolución recibida": "05 Devolucion Recibida",
}


# ── Validación de fila ─────────────────────────────────────────────────────────
def es_fila_valida(codigo: str, fecha, tipo_op: str) -> bool:
    if pd.isna(fecha):
        return False
    if not codigo or str(codigo).strip() == "":
        return False
    if str(tipo_op).strip().lower() not in TIPOS_OPERACION_VALIDOS:
        return False
    return True


# ── Detección automática del offset (si hay columna "Descripción") ─────────────
def _detectar_offset(df_raw: pd.DataFrame) -> int:
    """
    Determina si el Excel tiene columna "Descripción" en B.
    Retorna 0 si el formato es el viejo (sin descripción).
    Retorna 1 si el formato es el nuevo (con descripción en B).
    """
    if len(df_raw.columns) < 2:
        return 0

    # Revisar las primeras filas para detectar el formato
    for i in range(min(10, len(df_raw))):
        valor_b = df_raw.iloc[i, 1]
        if pd.isna(valor_b):
            continue

        # ¿Parece fecha? → formato viejo, no hay descripción
        fecha_test = pd.to_datetime(valor_b, errors="coerce", dayfirst=True)
        if pd.notna(fecha_test):
            return 0

        # ¿Es texto no numérico? → formato nuevo, hay descripción
        valor_str = str(valor_b).strip()
        if valor_str and not valor_str.replace('.', '').replace(',', '').replace('-', '').isdigit():
            return 1

    return 0


# ── Lectura del archivo de saldos iniciales ────────────────────────────────────
def parsear_saldos_iniciales(file_bytes: bytes) -> dict:
    """
    Lee el archivo Excel de saldos iniciales.
    Retorna dict: { codigo: { cantidad, costo_unitario, costo_total } }
    """
    df = pd.read_excel(io.BytesIO(file_bytes), header=None, dtype={0: str, 3: str, 4: str, 5: str})
    saldos = {}

    for _, row in df.iterrows():
        codigo  = str(row.iloc[0]).strip() if pd.notna(row.iloc[0]) else ""
        tipo_op = str(row.iloc[2]).strip().lower() if pd.notna(row.iloc[2]) else ""

        if not codigo or "saldo" not in tipo_op:
            continue

        try:
            # Parsear fecha — soporta string dd/mm/yyyy, yyyy-mm-dd y datetime
            fecha_raw = row.iloc[1]
            if pd.isna(fecha_raw):
                fecha = None
            elif isinstance(fecha_raw, str):
                fecha = pd.to_datetime(fecha_raw, dayfirst=True, errors="coerce")
                fecha = fecha.date() if pd.notna(fecha) else None
            else:
                fecha = pd.to_datetime(fecha_raw, errors="coerce")
                fecha = fecha.date() if pd.notna(fecha) else None

            cantidad       = float(Decimal(str(row.iloc[3])).normalize())
            costo_unitario = float(Decimal(str(row.iloc[4])).normalize())
            costo_total    = float(row.iloc[5])
        except Exception:
            continue

        saldos[codigo] = {
            "fecha":          fecha,
            "cantidad":       cantidad,
            "costo_unitario": costo_unitario,
            "costo_total":    costo_total,
        }

    return saldos


# ── Lectura del archivo de movimientos ────────────────────────────────────────
def parsear_movimientos(file_bytes: bytes, filename: str) -> tuple[pd.DataFrame, str | None]:
    """
    Lee el archivo Excel de movimientos.
    Detecta automáticamente si hay columna de descripción (formato nuevo).
    Ignora cabeceras y filas no válidas.
    Retorna (DataFrame, error_message)
    """
    try:
        df_raw = pd.read_excel(io.BytesIO(file_bytes), header=None, dtype={0: str})

        # Detectar si el Excel tiene columna "Descripción" en B
        offset = _detectar_offset(df_raw)

        # Índices de columnas según el offset detectado
        IDX_CODIGO   = 0
        IDX_FECHA    = 1 + offset
        IDX_TIPO     = 2 + offset
        IDX_SERIE    = 3 + offset
        IDX_NUMERO   = 4 + offset
        IDX_TIPO_OP  = 5 + offset
        IDX_ENT_CANT = 6 + offset
        IDX_ENT_UNIT = 7 + offset
        IDX_ENT_TOT  = 8 + offset
        IDX_SAL_CANT = 9 + offset
        IDX_SAL_UNIT = 10 + offset
        IDX_SAL_TOT  = 11 + offset

        min_cols = IDX_ENT_TOT + 1   # mínimo de columnas necesarias

        registros = []

        for _, row in df_raw.iterrows():
            if len(row) < min_cols:
                continue

            codigo  = str(row.iloc[IDX_CODIGO]).strip() if pd.notna(row.iloc[IDX_CODIGO]) else ""
            fecha   = pd.to_datetime(row.iloc[IDX_FECHA], errors="coerce", dayfirst=True)
            tipo_op = str(row.iloc[IDX_TIPO_OP]).strip() if pd.notna(row.iloc[IDX_TIPO_OP]) else ""

            if not es_fila_valida(codigo, fecha, tipo_op):
                continue

            tipo_comp = row.iloc[IDX_TIPO]
            serie     = str(row.iloc[IDX_SERIE]).strip() if pd.notna(row.iloc[IDX_SERIE]) else ""
            numero    = row.iloc[IDX_NUMERO]

            ent_cant  = float(pd.to_numeric(row.iloc[IDX_ENT_CANT], errors="coerce") or 0.0)
            ent_unit  = float(pd.to_numeric(row.iloc[IDX_ENT_UNIT], errors="coerce") or 0.0)
            ent_total = float(pd.to_numeric(row.iloc[IDX_ENT_TOT],  errors="coerce") or 0.0)

            sal_cant  = float(pd.to_numeric(row.iloc[IDX_SAL_CANT], errors="coerce") if len(row) > IDX_SAL_CANT else 0.0) or 0.0
            sal_unit  = float(pd.to_numeric(row.iloc[IDX_SAL_UNIT], errors="coerce") if len(row) > IDX_SAL_UNIT else 0.0) or 0.0
            sal_total = float(pd.to_numeric(row.iloc[IDX_SAL_TOT],  errors="coerce") if len(row) > IDX_SAL_TOT  else 0.0) or 0.0

            sal_cant  = sal_cant  if not pd.isna(sal_cant)  else 0.0
            sal_unit  = sal_unit  if not pd.isna(sal_unit)  else 0.0
            sal_total = sal_total if not pd.isna(sal_total) else 0.0

            registros.append({
                "Codigo":               codigo,
                "Fecha":                fecha,
                "Tipo":                 tipo_comp,
                "Serie":                serie,
                "Numero":               numero,
                "Tipo_Operacion":       TIPO_OP_MAP.get(tipo_op.lower(), tipo_op),
                "Ent_Cantidad":         ent_cant,
                "Ent_Costo_Unit":       ent_unit,
                "Ent_Costo_Total":      ent_total,
                "Sal_Cantidad":         sal_cant,
                "Sal_Costo_Unit":       sal_unit,
                "Sal_Costo_Total":      sal_total,
                "Orig_Ent_Costo_Unit":  ent_unit,
                "Orig_Ent_Costo_Total": ent_total,
                "Orig_Sal_Costo_Unit":  sal_unit,
                "Orig_Sal_Costo_Total": sal_total,
            })

        # 🔍 Debug temporal — puedes quitarlo después
        print(f"[parser] {filename}: offset={offset}, registros válidos={len(registros)}")

        if not registros:
            return None, f"'{filename}' no contiene registros válidos."

        return pd.DataFrame(registros), None

    except Exception as e:
        return None, f"Error al leer '{filename}': {str(e)}"


# ── Detección de códigos duplicados entre archivos ────────────────────────────
def detectar_duplicados(frames: dict[str, pd.DataFrame]) -> dict[str, set]:
    """
    Detecta si el mismo código aparece en más de un archivo.
    Retorna dict: { codigo: {archivo1, archivo2} }
    """
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
    - 01 Venta        → SALIDA.  Costo promedio NO cambia.
    - 02 Compra       → ENTRADA. Costo promedio SE RECALCULA.
    - 05 Devolución   → ENTRADA. Costo unitario entrada = 0. Costo promedio NO cambia.

    Retorna (DataFrame calculado, AlertasProcesamiento)
    """
    df = df.copy()

    df["Saldo_Cantidad"]    = 0.0
    df["Saldo_Costo_Unit"]  = 0.0
    df["Saldo_Costo_Total"] = 0.0
    df["Sin_Saldo_Inicial"] = False
    df["Saldo_Negativo"]    = False

    # Ordenar: Código, Fecha, compras antes que ventas en el mismo día
    df["_orden_op"] = df["Tipo_Operacion"].apply(
        lambda x: 0 if "compra" in str(x).lower() else 1
    )
    df = df.sort_values(["Codigo", "Fecha", "_orden_op"]).reset_index(drop=True)
    df = df.drop(columns=["_orden_op"])

    codigos_sin_saldo = []
    codigos_negativos = []

    for codigo in df["Codigo"].unique():
        mask    = df["Codigo"] == codigo
        indices = list(df[mask].index)

        saldo_ini = saldos_iniciales.get(codigo)
        if saldo_ini:
            s_cant  = saldo_ini["cantidad"]
            s_unit  = saldo_ini["costo_unitario"]
            s_total = saldo_ini["costo_total"]
        else:
            s_cant  = 0.0
            s_unit  = 0.0
            s_total = 0.0
            df.loc[mask, "Sin_Saldo_Inicial"] = True
            codigos_sin_saldo.append(codigo)

        tiene_negativo = False

        for idx in indices:
            tipo_op = str(df.at[idx, "Tipo_Operacion"]).strip().lower()

            if "venta" in tipo_op:
                sal_cant  = df.at[idx, "Sal_Cantidad"]
                sal_unit  = s_unit
                sal_total = round(sal_cant * s_unit, 10)

                df.at[idx, "Sal_Costo_Unit"]  = sal_unit
                df.at[idx, "Sal_Costo_Total"] = sal_total

                s_cant  = round(s_cant  - sal_cant,  10)
                s_total = round(s_total - sal_total, 10)

                if s_cant < 0:
                    df.at[idx, "Saldo_Negativo"] = True
                    tiene_negativo = True

            elif "compra" in tipo_op:
                ent_cant  = df.at[idx, "Ent_Cantidad"]
                ent_unit  = df.at[idx, "Ent_Costo_Unit"]
                ent_total = round(ent_cant * ent_unit, 10)

                df.at[idx, "Ent_Costo_Total"] = ent_total

                s_cant  = round(s_cant  + ent_cant,  10)
                s_total = round(s_total + ent_total, 10)
                s_unit  = round(s_total / s_cant, 10) if s_cant != 0 else 0.0

            elif "devolu" in tipo_op:
                dev_cant = df.at[idx, "Ent_Cantidad"]

                df.at[idx, "Ent_Costo_Unit"]  = 0.0
                df.at[idx, "Ent_Costo_Total"] = 0.0

                s_cant  = round(s_cant  + dev_cant, 10)
                s_total = round(s_cant  * s_unit,   10)

            df.at[idx, "Saldo_Cantidad"]    = s_cant
            df.at[idx, "Saldo_Costo_Unit"]  = s_unit
            df.at[idx, "Saldo_Costo_Total"] = s_total

        if tiene_negativo:
            codigos_negativos.append(codigo)

    alertas = AlertasProcesamiento(
        sin_saldo_inicial = codigos_sin_saldo,
        saldo_negativo    = codigos_negativos,
        duplicados        = [],
    )

    return df, alertas


# ── Verificación de integridad ────────────────────────────────────────────────
def verificar_integridad(df: pd.DataFrame, tolerancia: float = TOLERANCIA) -> pd.DataFrame:
    """
    Opción A — Compara valores calculados vs originales del Excel.
    Opción B — Verifica consistencia interna del Excel original.

    Semáforo:
        🟢 Todo correcto
        🟡 Inconsistencia interna (Opción B)
        🔴 Valor calculado difiere del Excel (Opción A)
        ⚫ Múltiples problemas
    """
    df = df.copy()
    df["Error_A"]  = False   # calculado vs original
    df["Error_B"]  = False   # consistencia interna
    df["Semaforo"] = "🟢"    # calculado en runtime, no se guarda en BD

    for idx in df.index:
        tipo_op = str(df.at[idx, "Tipo_Operacion"]).strip().lower()

        if "devolu" in tipo_op:
            continue

        if "compra" in tipo_op:
            ent_cant  = df.at[idx, "Ent_Cantidad"]
            ent_unit  = df.at[idx, "Orig_Ent_Costo_Unit"]
            orig_ent  = df.at[idx, "Orig_Ent_Costo_Total"]
            calc_ent  = df.at[idx, "Ent_Costo_Total"]

            # B: consistencia interna
            if ent_cant > 0 and ent_unit > 0:
                if abs(round(ent_cant * ent_unit, 10) - orig_ent) > tolerancia:
                    df.at[idx, "Error_B"] = True

            # A: calculado vs original
            if abs(calc_ent - orig_ent) > tolerancia:
                df.at[idx, "Error_A"] = True

        if "venta" in tipo_op:
            sal_cant       = df.at[idx, "Sal_Cantidad"]
            orig_sal_unit  = df.at[idx, "Orig_Sal_Costo_Unit"]
            orig_sal_total = df.at[idx, "Orig_Sal_Costo_Total"]
            calc_sal_unit  = df.at[idx, "Sal_Costo_Unit"]
            calc_sal_total = df.at[idx, "Sal_Costo_Total"]

            # B: consistencia interna
            if sal_cant > 0 and orig_sal_unit > 0:
                if abs(round(sal_cant * orig_sal_unit, 10) - orig_sal_total) > tolerancia:
                    df.at[idx, "Error_B"] = True

            # A: calculado vs original
            if abs(calc_sal_unit  - orig_sal_unit)  > tolerancia:
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
    ultima_fila = df.iloc[-1] if len(df) > 0 else None
    return {
        "total_ent_cantidad":   float(df["Ent_Cantidad"].sum()),
        "total_ent_costo":      float(df["Ent_Costo_Total"].sum()),
        "total_sal_cantidad":   float(df["Sal_Cantidad"].sum()),
        "total_sal_costo":      float(df["Sal_Costo_Total"].sum()),
        "saldo_final_cantidad": float(ultima_fila["Saldo_Cantidad"])    if ultima_fila is not None else 0.0,
        "saldo_final_costo":    float(ultima_fila["Saldo_Costo_Total"]) if ultima_fila is not None else 0.0,
    }