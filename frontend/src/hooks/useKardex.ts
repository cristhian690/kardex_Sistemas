import { useState, useCallback } from 'react'
import { procesarArchivos, getKardex, exportarKardex } from '../services/kardex'
import type {
  KardexRow,
  Metricas,
  FiltroFecha,
  AlertasProcesamiento,
  ApiError,
} from '../types'

interface UseKardexState {
  movimientos:       KardexRow[]
  metricas:          Metricas | null
  alertas:           AlertasProcesamiento | null
  loading:           boolean
  error:             string | null
  procesamientoId:   number | null
  totalRegistros:    number
  erroresIntegridad: number
}

const initialState: UseKardexState = {
  movimientos:       [],
  metricas:          null,
  alertas:           null,
  loading:           false,
  error:             null,
  procesamientoId:   null,
  totalRegistros:    0,
  erroresIntegridad: 0,
}

export const useKardex = () => {
  const [state,     setState]     = useState<UseKardexState>(initialState)
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // ── Subir y procesar archivos (MODO UNIVERSAL) ─────────────────────────────
  const subirArchivos = useCallback(async (
    archivosMovimientos: File[],
    archivoSaldos:       File | null,
    // 🧠 ¡Quitamos empresaId de aquí!
  ) => {
    setUploading(true)
    setState(prev => ({ ...prev, error: null }))

    try {
      // 🧠 Invocación limpia en cascada directa al backend universal
      const upload = await procesarArchivos(archivosMovimientos, archivoSaldos)
      const data   = await getKardex(upload.procesamiento_id)

      setState({
        movimientos:       data.movimientos,
        metricas:          data.metricas,
        alertas:           data.alertas,
        loading:           false,
        error:             null,
        procesamientoId:   upload.procesamiento_id,
        totalRegistros:    data.total_registros,
        erroresIntegridad: data.errores_integridad,
      })

      return upload
    } catch (err) {
      const error = err as ApiError
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al procesar los archivos',
      }))
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  // ── Consultar kardex con filtros (Se mantiene igual) ───────────────────────
  const cargarKardex = useCallback(async (
    procesamientoId: number,
    filtro?: FiltroFecha & { codigo?: string },
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const data = await getKardex(procesamientoId, filtro)

      setState(prev => ({
        ...prev,
        movimientos:       data.movimientos,
        metricas:          data.metricas,
        alertas:           data.alertas,
        loading:           false,
        error:             null,
        procesamientoId:   procesamientoId,
        totalRegistros:    data.total_registros,
        erroresIntegridad: data.errores_integridad,
      }))
    } catch (err) {
      const error = err as ApiError
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Error al cargar el Kardex',
      }))
    }
  }, [])

  // ── Exportar a Excel (Se mantiene igual) ───────────────────────────────────
  const descargarExcel = useCallback(async (
    codigo?:     string,
    anio?:       number,
    mes?:        number,
    fechaDesde?: string,
    fechaHasta?: string,
  ) => {
    if (!state.procesamientoId) return

    setExporting(true)
    try {
      await exportarKardex(state.procesamientoId, codigo, anio, mes, fechaDesde, fechaHasta)
    } catch (err) {
      const error = err as ApiError
      setState(prev => ({
        ...prev,
        error: error.message || 'Error al exportar el archivo',
      }))
    } finally {
      setExporting(false)
    }
  }, [state.procesamientoId])

  const limpiar = useCallback(() => setState(initialState), [])

  return {
    ...state,
    uploading,
    exporting,
    subirArchivos,
    cargarKardex,
    descargarExcel,
    limpiar,
  }
}