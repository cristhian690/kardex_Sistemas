import api from './api'
import type { KardexResponse, UploadResponse, FiltroFecha, ProcesamientoResumen } from '../types'

// ── Procesar archivos ─────────────────────────────────────────────────────────
export const procesarArchivos = async (
  archivosMovimientos: File[],
  archivoSaldos?: File | null,
): Promise<UploadResponse> => {
  const formData = new FormData()

  // Todos los archivos bajo el MISMO nombre "movimientos" — FastAPI los recibe como List
  archivosMovimientos.forEach(file => {
    formData.append('movimientos', file)
  })

  if (archivoSaldos) {
    formData.append('saldos', archivoSaldos)
  }

  const response = await api.post('/api/v1/kardex/procesar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return response.data
}

// ── Consultar kardex con filtros ──────────────────────────────────────────────
export const getKardex = async (
  procesamientoId: number,
  filtro?: FiltroFecha & { codigo?: string },
): Promise<KardexResponse> => {
  const params: Record<string, string | number> = {}

  if (filtro?.codigo) params.codigo = filtro.codigo

  if (filtro) {
    if (filtro.modo === 'anio_mes') {
      if (filtro.anio) params.anio = filtro.anio
      if (filtro.mes)  params.mes  = filtro.mes
    } else if (filtro.modo === 'exacta' && filtro.fecha_exacta) {
      params.fecha_exacta = filtro.fecha_exacta
    } else if (filtro.modo === 'rango') {
      if (filtro.fecha_desde) params.fecha_desde = filtro.fecha_desde
      if (filtro.fecha_hasta) params.fecha_hasta = filtro.fecha_hasta
    }
  }

  const response = await api.get(`/api/v1/kardex/consultar/${procesamientoId}`, { params })
  return response.data
}

// ── Exportar a Excel ──────────────────────────────────────────────────────────
export const exportarKardex = async (
  procesamientoId: number,
  codigo?:     string,
  anio?:       number,
  mes?:        number,
  fechaDesde?: string,
  fechaHasta?: string,
): Promise<void> => {
  const params: Record<string, string | number> = {}

  if (codigo)     params.codigo      = codigo
  if (anio)       params.anio        = anio
  if (mes)        params.mes         = mes
  if (fechaDesde) params.fecha_desde = fechaDesde
  if (fechaHasta) params.fecha_hasta = fechaHasta

  const response = await api.get(`/api/v1/kardex/exportar/${procesamientoId}`, {
    params,
    responseType: 'blob',
  })

  const url  = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href  = url

  // Nombre del archivo refleja los filtros aplicados
  let nombreArchivo = `kardex_${procesamientoId}`
  if (codigo) nombreArchivo += `_${codigo}`
  if (anio && mes) nombreArchivo += `_${anio}_${String(mes).padStart(2, '0')}`
  nombreArchivo += '.xlsx'

  link.setAttribute('download', nombreArchivo)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// ── Historial de procesamientos ───────────────────────────────────────────────
export const getHistorial = async (
  limit  = 20,
  offset = 0,
): Promise<ProcesamientoResumen[]> => {
  const response = await api.get('/api/v1/historial/', {
    params: { limit, offset },
  })
  return response.data
}
// ── Eliminar un procesamiento ─────────────────────────────────────────────────
export const eliminarProcesamiento = async (procesamientoId: number): Promise<void> => {
  await api.delete(`/api/v1/historial/${procesamientoId}`)
}

// ── Eliminar varios procesamientos ────────────────────────────────────────────
export const eliminarProcesamientosMultiple = async (ids: number[]): Promise<{ eliminados: number; fallidos: number[] }> => {
  const response = await api.post('/api/v1/historial/eliminar-multiple', { ids })
  return response.data
}