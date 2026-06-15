// ── Empresa ───────────────────────────────────────────────────────────────────
export interface Empresa {
  id:        number
  nombre:    string
  ruc:       string
  direccion: string | null
  creado_en: string

  // Metadata opcional para el reporte SUNAT impreso
  establecimiento?:   string
  tipo?:              string
  metodo_valuacion?:  string
  codigo_existencia?: string
} 

export interface EmpresaCreate {
  nombre:    string
  ruc:       string
  direccion?: string
}

export interface EmpresaUpdate {
  nombre?:    string
  ruc?:       string
  direccion?: string
}

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
  id:                number
  empresa_id:        number
  codigo:            string
  descripcion:       string | null
  total_saldos:      number
  codigo_existencia: string | null
  unidad_medida:     string | null
  creado_en:         string
  empresa?:          Empresa
}

// ── Saldo Inicial ─────────────────────────────────────────────────────────────
export interface SaldoInicial {
  id:             number
  producto_id:    number
  codigo:         string
  descripcion:    string | null
  fecha:          string
  cantidad:       number
  costo_unitario: number
  costo_total:    number
  creado_en:      string
}

// ── Movimiento base ───────────────────────────────────────────────────────────
export interface Movimiento {
  id:               number
  producto_id:      number
  procesamiento_id: number
  codigo:           string
  fecha:            string
  tipo_comprobante: number
  serie:            string
  numero:           string
  tipo_operacion:   string
  ent_cantidad:     number
  ent_costo_unit:   number
  ent_costo_total:  number
  sal_cantidad:     number
  sal_costo_unit:   number
  sal_costo_total:  number
  orig_ent_costo_unit:  number
  orig_ent_costo_total: number
  orig_sal_costo_unit:  number
  orig_sal_costo_total: number
  producto?:            Producto
}

// ── Fila del Kardex ───────────────────────────────────────────────────────────
export interface KardexRow extends Movimiento {
  saldo_cantidad:    number
  saldo_costo_unit:  number
  saldo_costo_total: number
  saldo_negativo:    boolean
  error_a:            boolean
  error_b:            boolean
  sin_saldo_inicial:  boolean
  costo_reconstruido: boolean
  semaforo:          '🟢' | '🟡' | '🔴' | '⚫'
  fila:              number
  creado_en:         string
  es_saldo_inicial?: boolean
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