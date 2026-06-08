import { useState, useEffect, useRef } from 'react'

interface ProductoCreate {
  empresa_id:        number
  codigo:            string
  descripcion:       string | null
  codigo_existencia: string | null
  unidad_medida:     string | null
}

interface ProductoUpdate {
  empresa_id?:        number
  descripcion?:       string | null
  codigo_existencia?: string | null
  unidad_medida?:     string | null
}

interface ProductoExistente {
  id:                number
  empresa_id:        number
  codigo:            string
  descripcion?:      string | null
  codigo_existencia?: string | null
  unidad_medida?:    string | null
}

interface Empresa {
  id:     number
  nombre: string
}

interface Props {
  open:            boolean
  onClose:         () => void
  onGuardado?:     () => void
  productoEditar?: ProductoExistente | null
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function parseFastApiError(data: any, status: number): string {
  if (!data?.detail) return `Error ${status}`
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => {
      const campo = err.loc?.[err.loc.length - 1] || 'Campo'
      return `Error en ${campo}: ${err.msg}`
    }).join(' | ')
  }
  return JSON.stringify(data.detail)
}

async function crearProducto(payload: ProductoCreate) {
  const res = await fetch(`${API}/api/v1/productos/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseFastApiError(data, res.status))
  return data
}

// ✅ CORREGIDO: PATCH solo envía ProductoUpdate (sin codigo)
async function editarProducto(id: number, payload: ProductoUpdate) {
  const res = await fetch(`${API}/api/v1/productos/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseFastApiError(data, res.status))
  return data
}

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
const IconBox = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
)

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

export default function ModalProducto({ open, onClose, onGuardado, productoEditar }: Props) {
  const modoEditar = !!productoEditar

  const [empresas,        setEmpresas]        = useState<Empresa[]>([])
  const [empresaIdSelect, setEmpresaIdSelect] = useState<string>('')
  const [codigo,          setCodigo]          = useState('')
  const [descripcion,     setDescripcion]     = useState('')
  const [codExistencia,   setCodExistencia]   = useState('01')
  const [unidadMedida,    setUnidadMedida]    = useState('NIU')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const cargarEmpresas = async () => {
    try {
      const res = await fetch(`${API}/api/v1/empresa/`)
      if (res.ok) {
        const list: Empresa[] = await res.json()
        setEmpresas(list)
        if (list.length > 0 && !productoEditar) {
          setEmpresaIdSelect(String(list[0].id))
        }
      }
    } catch (e) {
      console.error('Error cargando empresas', e)
    }
  }

  useEffect(() => {
    if (open) cargarEmpresas()
  }, [open])

  useEffect(() => {
    if (!open) return

    if (productoEditar) {
      setEmpresaIdSelect(String(productoEditar.empresa_id))
      setCodigo(productoEditar.codigo)
      setDescripcion(productoEditar.descripcion ?? '')
      setCodExistencia(productoEditar.codigo_existencia ?? '01')
      setUnidadMedida(productoEditar.unidad_medida ?? 'NIU')
    } else {
      setCodigo('')
      setDescripcion('')
      setCodExistencia('01')
      setUnidadMedida('NIU')
      if (empresas.length > 0) setEmpresaIdSelect(String(empresas[0].id))
    }

    setError(null)
    setSuccess(false)
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [open, productoEditar])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const valido = codigo.trim() && empresaIdSelect !== ''

  const handleGuardar = async () => {
    if (!valido || loading) return
    setLoading(true)
    setError(null)

    try {
      if (modoEditar && productoEditar) {
        // ✅ CORREGIDO: PATCH solo envía ProductoUpdate (sin codigo)
        const payload: ProductoUpdate = {
          empresa_id:        Number(empresaIdSelect),
          descripcion:       descripcion.trim() || null,
          codigo_existencia: codExistencia.trim() || '01',
          unidad_medida:     unidadMedida.trim() || 'NIU',
        }
        await editarProducto(productoEditar.id, payload)
      } else {
        // ✅ POST envía ProductoCreate completo (con codigo)
        const payload: ProductoCreate = {
          empresa_id:        Number(empresaIdSelect),
          codigo:            codigo.trim().toUpperCase(),
          descripcion:       descripcion.trim() || null,
          codigo_existencia: codExistencia.trim() || '01',
          unidad_medida:     unidadMedida.trim() || 'NIU',
        }
        await crearProducto(payload)
      }

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
        background: 'rgba(4,10,24,0.82)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)',
      }}
    >
      <style>{`
        .mprod-input {
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
        .mprod-input:focus { border-color: rgba(59,130,246,0.55); }
        .mprod-input:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div style={{
        width: 420, background: '#0d1525',
        border: '1px solid rgba(56,139,221,0.18)',
        borderTop: `2px solid ${modoEditar ? '#f59e0b' : '#3b82f6'}`,
        borderRadius: 12, padding: '20px 22px',
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
              <IconBox />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
                {modoEditar ? 'Reasignar / Editar Producto' : 'Registrar Nuevo Producto'}
              </div>
              <div style={{ fontSize: 11, color: '#1e3a5a' }}>
                {modoEditar ? `Código: ${productoEditar?.codigo}` : 'Inserción manual en el catálogo'}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#2a5a8a', cursor: 'pointer', padding: 2 }}>
            <IconX />
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(56,139,221,0.1)' }} />

        {/* Formulario */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <Field label="Empresa de Asignación *">
            <select
              className="mprod-input"
              value={empresaIdSelect}
              onChange={e => setEmpresaIdSelect(e.target.value)}
            >
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.id === 1 ? '⚠️ ' : ''}{emp.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Código *">
            <input
              ref={inputRef}
              className="mprod-input"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              disabled={modoEditar}
              placeholder="Ej: 011004"
            />
          </Field>

          <Field label="Descripción">
            <input
              className="mprod-input"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: FURALTADONA HCL-01"
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Unidad de Medida">
              <input
                className="mprod-input"
                value={unidadMedida}
                onChange={e => setUnidadMedida(e.target.value)}
                placeholder="Ej: NIU o KGM"
              />
            </Field>
            <Field label="Tipo Existencia SUNAT">
              <input
                className="mprod-input"
                value={codExistencia}
                onChange={e => setCodExistencia(e.target.value)}
                placeholder="Ej: 01"
              />
            </Field>
          </div>
        </div>

        {error   && <Msg color="#fca5a5">✕ {error}</Msg>}
        {success && <Msg color="#4ade80"><IconCheck /> {modoEditar ? 'Producto reclasificado' : 'Producto registrado'}</Msg>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', borderRadius: 7, cursor: 'pointer',
              background: 'rgba(56,139,221,0.06)', border: '1px solid rgba(56,139,221,0.14)',
              color: '#2a5a8a', fontSize: 12, fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!valido || loading}
            style={{
              padding: '7px 18px', borderRadius: 7,
              cursor: !valido || loading ? 'not-allowed' : 'pointer',
              background: !valido || loading
                ? 'rgba(29,78,216,0.3)'
                : modoEditar
                  ? 'linear-gradient(135deg,#d97706,#b45309)'
                  : 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
              border: 'none', color: '#e2e8f0', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? <><IconSpinner /> Guardando...</> : modoEditar ? 'Reclasificar' : 'Guardar Producto'}
          </button>
        </div>

      </div>
    </div>
  )
}