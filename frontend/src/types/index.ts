// ── Alertas ───────────────────────────────────────────────────────────────────
export interface AlertasProcesamiento {
  sin_saldo_inicial: string[]
  saldo_negativo:    string[]
  duplicados:        string[]
}

// ── Procesamiento completo ────────────────────────────────────────────────────
export interface Procesamiento {
  id:                   number
  nombre_archivo:       string
  total_registros:      number
  productos_procesados: number
  estado:               'exitoso' | 'con_alertas' | 'error'
  alertas:              AlertasProcesamiento
  creado_en:            string
}

// ── Resumen para historial (sin movimientos) ──────────────────────────────────
export interface ProcesamientoResumen {
  id:                   number
  nombre_archivo:       string
  total_registros:      number
  productos_procesados: number
  estado:               'procesado' | 'con_alertas' | 'error'
  creado_en:            string
}

// ── Respuesta al subir archivos ───────────────────────────────────────────────
export interface UploadResponse {
  procesamiento_id:     number
  total_registros:      number
  productos_procesados: number
  alertas:              AlertasProcesamiento
  estado:               'exitoso' | 'con_alertas' | 'error'
}

// ── Producto ──────────────────────────────────────────────────────────────────
export interface Producto {
  id:          number
  codigo:      string
  descripcion: string
}

// ── Saldo Inicial ─────────────────────────────────────────────────────────────
export interface SaldoInicial {
  id:             number
  producto_id:    number
  fecha:          string
  cantidad:       number
  costo_unitario: number
  costo_total:    number
}

// ── Movimiento base ───────────────────────────────────────────────────────────
export interface Movimiento {
  id:               number
  producto_id:      number
  procesamiento_id: number
  codigo:           string   // ← viene del join con productos en el backend
  fecha:            string
  tipo_comprobante: number
  serie:            string
  numero:           string
  tipo_operacion:   string
  // Entradas
  ent_cantidad:    number
  ent_costo_unit:  number
  ent_costo_total: number
  // Salidas
  sal_cantidad:    number
  sal_costo_unit:  number
  sal_costo_total: number
  // Originales del Excel (para verificación de integridad)
  orig_ent_costo_unit:  number
  orig_ent_costo_total: number
  orig_sal_costo_unit:  number
  orig_sal_costo_total: number
}

// ── Fila del Kardex (movimiento + saldo calculado + flags) ────────────────────
export interface KardexRow extends Movimiento {
  saldo_cantidad:    number
  saldo_costo_unit:  number
  saldo_costo_total: number
  saldo_negativo:    boolean

  error_a:           boolean   // ✅ agregar
  error_b:           boolean   // ✅ agregar

  semaforo:          '🟢' | '🟡' | '🔴' | '⚫'
  fila:              number    // (si ya lo estás usando)
  creado_en:         string
}

// ── Métricas resumen ──────────────────────────────────────────────────────────
export interface Metricas {
  total_ent_cantidad:   number
  total_ent_costo:      number
  total_sal_cantidad:   number
  total_sal_costo:      number
  saldo_final_cantidad: number
  saldo_final_costo:    number
}

// ── Respuesta completa del kardex ─────────────────────────────────────────────
export interface KardexResponse {
  procesamiento_id:   number
  codigo:             string
  total_registros:    number
  errores_integridad: number
  alertas:            AlertasProcesamiento
  metricas:           Metricas
  movimientos:        KardexRow[]
}

// ── Filtros de fecha ──────────────────────────────────────────────────────────
export type ModoFiltro = 'anio_mes' | 'exacta' | 'rango'

export interface FiltroFecha {
  modo:          ModoFiltro
  anio?:         number
  mes?:          number
  fecha_exacta?: string
  fecha_desde?:  string
  fecha_hasta?:  string
}

// ── Estado de carga / error ───────────────────────────────────────────────────
export interface ApiError {
  message: string
  status?: number
}
// ── Autenticación ─────────────────────────────────────────────────────────────
export interface Usuario {
  id:              number
  username:        string
  nombre_completo: string | null
  rol:             string
  activo:          boolean
  ultimo_login:    string | null
}

export interface LoginPayload {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type:   string
}