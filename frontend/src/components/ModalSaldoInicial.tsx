import { useState, useEffect, useRef } from 'react'

interface SaldoPayload {
  codigo:         string
  descripcion:    string
  fecha:          string
  cantidad:       number
  costo_unitario: number
}

// Saldo completo para modo edición
interface SaldoExistente {
  id:             number
  codigo:         string
  descripcion?:   string
  fecha:          string
  cantidad:       number | string
  costo_unitario: number | string
  costo_total:    number | string
}

interface Props {
  open:          boolean
  onClose:       () => void
  onGuardado?:   () => void
  saldoEditar?:  SaldoExistente | null
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function crearSaldo(payload: SaldoPayload) {
  const res = await fetch(`${API}/api/v1/saldos/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.detail ?? `Error ${res.status}`)
  return data
}

async function editarSaldo(id: number, payload: Omit<SaldoPayload, 'codigo'> & { costo_total?: number }) {
  const res = await fetch(`${API}/api/v1/saldos/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.detail ?? `Error ${res.status}`)
  return data
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconSpinner = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'mspin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <style>{`@keyframes mspin{to{transform:rotate(360deg)}}`}</style>
  </svg>
)
const IconSaldo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

/* ── Helpers visuales ─────────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
        textTransform: 'uppercase' as const, color: '#1e3a5a',
        marginBottom: 5, fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Msg({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div style={{ borderRadius: 7, padding: '8px 12px', fontSize: 12, color, display: 'flex', gap: 6, alignItems: 'center' }}>
      {children}
    </div>
  )
}

/* ── Helper: convertir cualquier cosa a número seguro ─────────────────────── */
const toNum = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export default function ModalSaldoInicial({ open, onClose, onGuardado, saldoEditar }: Props) {
  const hoy        = new Date().toISOString().split('T')[0]
  const modoEditar = !!saldoEditar

  const [codigo,             setCodigo]             = useState('')
  const [descripcion,        setDescripcion]        = useState('')
  const [fecha,              setFecha]              = useState(hoy)
  const [cantidad,           setCantidad]           = useState('')
  const [costoUnit,          setCostoUnit]          = useState('')
  // ✅ FIX: guardamos el costo_total original de la BD
  const [costoTotalOriginal, setCostoTotalOriginal] = useState<number | null>(null)
  // ✅ FIX: rastreamos si el usuario modificó cantidad o costo unitario
  const [camposModificados,  setCamposModificados]  = useState(false)

  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)
  const [advertencia, setAdvertencia] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (!open) return

    if (saldoEditar) {
      // Modo edición — cargar datos existentes (convertir a número por si vienen como string)
      setCodigo(saldoEditar.codigo)
      setDescripcion(saldoEditar.descripcion ?? '')
      setFecha(saldoEditar.fecha)
      setCantidad(String(toNum(saldoEditar.cantidad)))
      setCostoUnit(String(toNum(saldoEditar.costo_unitario)))
      // ✅ FIX: convertir a número antes de guardar (la BD lo devuelve como string)
      setCostoTotalOriginal(toNum(saldoEditar.costo_total))
      setCamposModificados(false)
    } else {
      // Modo creación — limpiar formulario
      setCodigo('')
      setDescripcion('')
      setFecha(hoy)
      setCantidad('')
      setCostoUnit('')
      setCostoTotalOriginal(null)
      setCamposModificados(false)
    }

    setError(null)
    setSuccess(false)
    setAdvertencia(null)
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [open, saldoEditar])

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // ✅ FIX: usa el total original de BD a menos que el usuario haya cambiado los campos
  const costoTotal: number = (!modoEditar || camposModificados || costoTotalOriginal === null)
    ? toNum(cantidad) * toNum(costoUnit)
    : costoTotalOriginal

  const valido =
    codigo.trim() &&
    toNum(cantidad) > 0 &&
    toNum(costoUnit) > 0

  // ✅ FIX: handlers que marcan cuando el usuario modifica manualmente
  const handleCantidadChange = (val: string) => {
    setCantidad(val)
    setCamposModificados(true)
  }

  const handleCostoUnitChange = (val: string) => {
    setCostoUnit(val)
    setCamposModificados(true)
  }

  const handleGuardar = async () => {
    if (!valido || loading) return

    setLoading(true)
    setError(null)

    try {
      let res

      if (modoEditar && saldoEditar) {
        // PUT /saldos/{id}
        res = await editarSaldo(saldoEditar.id, {
          descripcion:    descripcion.trim(),
          fecha,
          cantidad:       toNum(cantidad),
          costo_unitario: toNum(costoUnit),
          costo_total:    costoTotal,
        })
      } else {
        // POST /saldos/
        res = await crearSaldo({
          codigo:         codigo.trim().toUpperCase(),
          descripcion:    descripcion.trim(),
          fecha,
          cantidad:       toNum(cantidad),
          costo_unitario: toNum(costoUnit),
        })
      }

      setAdvertencia(res.advertencia ?? null)
      setSuccess(true)
      onGuardado?.()
      setTimeout(() => onClose(), 1200)

    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(4,10,24,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}
    >
      <style>{`
        .msaldo-input {
          width: 100%;
          background: rgba(13,21,37,0.9);
          border: 1px solid rgba(56,139,221,0.18);
          border-radius: 7px;
          padding: 8px 11px;
          font-size: 12px;
          font-family: 'IBM Plex Mono', monospace;
          color: #c8ddef;
          outline: none;
          transition: border-color .15s;
          box-sizing: border-box;
        }
        .msaldo-input:focus { border-color: rgba(59,130,246,0.55); }
        .msaldo-input:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{
        width: 420,
        background: '#0d1525',
        border: '1px solid rgba(56,139,221,0.18)',
        borderTop: `2px solid ${modoEditar ? '#f59e0b' : '#3b82f6'}`,
        borderRadius: 12,
        padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 16,
        fontFamily: "'Inter', sans-serif", color: '#c8ddef',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: modoEditar ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
              border: `1px solid ${modoEditar ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: modoEditar ? '#f59e0b' : '#60a5fa',
            }}>
              <IconSaldo />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                {modoEditar ? 'Editar saldo inicial' : 'Agregar saldo inicial'}
              </div>
              <div style={{ fontSize: 11, color: '#1e3a5a' }}>
                {modoEditar ? `Código: ${saldoEditar?.codigo}` : 'Stock base para cálculo CPP'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#2a5a8a', cursor: 'pointer', padding: 2 }}
          >
            <IconX />
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(56,139,221,0.1)' }} />

        {/* Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <Field label="Código">
            <input
              ref={inputRef}
              className="msaldo-input"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              disabled={modoEditar}
              placeholder="Ej: 011039"
            />
          </Field>

          <Field label="Descripción">
            <input
              className="msaldo-input"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Nombre del producto (opcional)"
            />
          </Field>

          <Field label="Fecha">
            <input
              type="date"
              className="msaldo-input"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Cantidad">
              <input
                className="msaldo-input"
                type="number"
                value={cantidad}
                onChange={e => handleCantidadChange(e.target.value)}
                placeholder="0.000"
              />
            </Field>
            <Field label="Costo unitario">
              <input
                className="msaldo-input"
                type="number"
                value={costoUnit}
                onChange={e => handleCostoUnitChange(e.target.value)}
                placeholder="0.000000"
              />
            </Field>
          </div>

          {/* Costo total */}
          <div style={{
            background: 'rgba(56,139,221,0.05)',
            border: '1px solid rgba(56,139,221,0.12)',
            borderRadius: 8, padding: '9px 12px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, color: '#1e3a5a' }}>Costo total calculado</span>
              {/* ✅ FIX: indicador visual de si es original o recalculado */}
              {modoEditar && (
                <span style={{ fontSize: 9, color: camposModificados ? '#f59e0b' : '#2a5a6a', fontFamily: "'IBM Plex Mono', monospace" }}>
                  {camposModificados ? '⚠ recalculado' : '✓ valor original BD'}
                </span>
              )}
            </div>
            <span style={{ fontWeight: 700, color: '#60a5fa', fontFamily: "'IBM Plex Mono', monospace" }}>
              S/ {costoTotal.toFixed(6)}
            </span>
          </div>

        </div>

        {/* Mensajes */}
        {error       && <Msg color="#fca5a5">✕ {error}</Msg>}
        {advertencia && <Msg color="#facc15">⚠ {advertencia}</Msg>}
        {success     && <Msg color="#4ade80"><IconCheck /> {modoEditar ? 'Actualizado' : 'Guardado'}</Msg>}

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', borderRadius: 7, cursor: 'pointer',
              background: 'rgba(56,139,221,0.06)',
              border: '1px solid rgba(56,139,221,0.14)',
              color: '#2a5a8a', fontSize: 12, fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!valido || loading}
            style={{
              padding: '7px 18px', borderRadius: 7, cursor: !valido || loading ? 'not-allowed' : 'pointer',
              background: !valido || loading
                ? 'rgba(29,78,216,0.3)'
                : modoEditar
                  ? 'linear-gradient(135deg,#d97706,#b45309)'
                  : 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
              border: 'none', color: '#e2e8f0',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <><IconSpinner /> Guardando...</> : modoEditar ? 'Actualizar saldo' : 'Guardar saldo'}
          </button>
        </div>

      </div>
    </div>
  )
}