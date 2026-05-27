import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import { getHistorial, eliminarProcesamientosMultiple } from '../services/kardex'
import type { ProcesamientoResumen, ApiError } from '../types'

/* ═══ Icons (solo los de esta página) ═══ */
const IconChevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {dir === 'left' ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
  </svg>
)
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
  </svg>
)

/* ═══ Estado config ═══ */
const estadoConfig = {
  procesado:   { label: 'Exitoso',     dot: '#22c55e', style: { background: 'rgba(34,197,94,0.1)',  border: '1px solid rgba(34,197,94,0.25)',  color: '#4ade80' } as React.CSSProperties },
  con_alertas: { label: 'Con alertas', dot: '#f59e0b', style: { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' } as React.CSSProperties },
  error:       { label: 'Error',       dot: '#ef4444', style: { background: 'rgba(239,68,68,0.1)',  border: '1px solid rgba(239,68,68,0.25)',  color: '#f87171' } as React.CSSProperties },
}

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/* ═══ Skeleton ═══ */
const SkeletonRow = () => (
  <div style={{ padding: '11px 16px', borderBottom: '1px solid rgba(56,139,221,0.07)', display: 'flex', gap: 16, alignItems: 'center' }}>
    {[32, 180, 80, 70, 60].map((w, i) => (
      <div key={i} style={{ height: 9, borderRadius: 4, background: 'rgba(56,139,221,0.08)', width: w, flexShrink: 0, animation: 'kpulse 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
    ))}
    <style>{`@keyframes kpulse{0%,100%{opacity:.6}50%{opacity:.2}}`}</style>
  </div>
)

/* ═══ Checkbox ═══ */
const Checkbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <span
    onClick={e => { e.stopPropagation(); onChange() }}
    style={{
      width: 16, height: 16, borderRadius: 4,
      border: `1.5px solid ${checked ? '#3b82f6' : 'rgba(56,139,221,0.35)'}`,
      background: checked ? '#3b82f6' : 'transparent',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0, transition: 'all .12s',
    }}
  >
    {checked && (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )}
  </span>
)

/* ═══ Page ═══ */
export default function Historial() {
  const navigate = useNavigate()
  const [procesamientos, setProcesamientos] = useState<ProcesamientoResumen[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)
  const [pagina,  setPagina]    = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [eliminando, setEliminando] = useState(false)
  const LIMIT = 20

  const cargar = async () => {
    setLoading(true); setError(null)
    try {
      const data = await getHistorial(LIMIT, (pagina - 1) * LIMIT)
      setProcesamientos(data)
      setSelectedIds(new Set())
    } catch (err) {
      const e = err as ApiError
      setError(e.message || 'Error al cargar el historial')
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [pagina])

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === procesamientos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(procesamientos.map(p => p.id)))
    }
  }

  const handleEliminar = async () => {
    if (selectedIds.size === 0) return
    const cantidad = selectedIds.size
    const msg = cantidad === 1
      ? '¿Eliminar este procesamiento? Esta acción no se puede deshacer.'
      : `¿Eliminar ${cantidad} procesamientos? Esta acción no se puede deshacer.`

    if (!window.confirm(msg)) return

    setEliminando(true)
    const toastId = toast.loading(`Eliminando ${cantidad}...`)
    try {
      const result = await eliminarProcesamientosMultiple(Array.from(selectedIds))
      toast.success(`${result.eliminados} procesamiento(s) eliminado(s)`, { id: toastId })
      await cargar()
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar', { id: toastId })
    } finally {
      setEliminando(false)
    }
  }

  const allSelected = procesamientos.length > 0 && selectedIds.size === procesamientos.length
  const hasSelection = selectedIds.size > 0

  const colWidths  = ['32px', '36px', '1fr', '110px', '90px', '90px', '30px']

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#07101e', fontFamily: "'Inter', sans-serif", color: '#c8ddef' }}>
      <Sidebar />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(56,139,221,0.1)', background: '#080e1c', flexShrink: 0, position: 'sticky' as const, top: 0, zIndex: 30 }}>
          <div>
            <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0, lineHeight: 1 }}>Actividad</h1>
            <p style={{ fontSize: 11, color: '#1e3a5a', marginTop: 2 }}>Procesamientos registrados</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {hasSelection && (
              <button
                type="button"
                onClick={handleEliminar}
                disabled={eliminando}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 13px', borderRadius: 7,
                  border: '1px solid rgba(239,68,68,0.3)',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#fca5a5',
                  fontSize: 12, fontWeight: 600,
                  cursor: eliminando ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: eliminando ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!eliminando) e.currentTarget.style.background = 'rgba(239,68,68,0.18)' }}
                onMouseLeave={e => { if (!eliminando) e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
              >
                <IconTrash /> Eliminar ({selectedIds.size})
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)', color: '#e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(29,78,216,0.3)' }}
            >
              <IconPlus /> Nuevo proceso
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 2, height: 12, background: '#3b82f6', borderRadius: 2 }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#1e3a5a', fontFamily: "'IBM Plex Mono', monospace" }}>
              Historial de importaciones
            </span>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fca5a5', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 12 }}>
              ✕ {error}
            </div>
          )}

          <div style={{ background: '#0d1525', border: '1px solid rgba(56,139,221,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '9px 16px', borderBottom: '1px solid rgba(56,139,221,0.08)', background: 'rgba(56,139,221,0.03)', display: 'grid', gridTemplateColumns: colWidths.join(' '), gap: 10, alignItems: 'center' }}>
              <div>
                {procesamientos.length > 0 && (
                  <Checkbox checked={allSelected} onChange={toggleSelectAll} />
                )}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: '#1e3a5a' }}>#</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: '#1e3a5a' }}>Archivo</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: '#1e3a5a' }}>Estado</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: '#1e3a5a', textAlign: 'right' as const }}>Registros</div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' as const, color: '#1e3a5a', textAlign: 'right' as const }}>Productos</div>
              <div></div>
            </div>

            {loading && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

            {!loading && !error && procesamientos.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(56,139,221,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📭</div>
                <p style={{ fontSize: 13, color: '#1e3a5a' }}>No hay procesamientos registrados</p>
                <button type="button" onClick={() => navigate('/')} style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Procesar mi primer archivo →
                </button>
              </div>
            )}

            {!loading && procesamientos.map((p) => {
              const cfg = estadoConfig[p.estado]
              const isSelected = selectedIds.has(p.id)
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/kardex/${p.id}`)}
                  style={{
                    width: '100%', padding: '10px 16px',
                    borderBottom: '1px solid rgba(56,139,221,0.07)',
                    background: isSelected ? 'rgba(59,130,246,0.06)' : 'transparent',
                    cursor: 'pointer',
                    display: 'grid', gridTemplateColumns: colWidths.join(' '), gap: 10, alignItems: 'center',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(56,139,221,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(59,130,246,0.06)' : 'transparent' }}
                >
                  <Checkbox checked={isSelected} onChange={() => toggleSelect(p.id)} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#1e3a5a' }}>#{p.id}</span>

                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#c8ddef', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{p.nombre_archivo}</p>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#1e3a5a', marginTop: 1 }}>{fmtFecha(p.creado_en)}</p>
                  </div>

                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, ...cfg.style }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                      {cfg.label}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: '#3b82f6', margin: 0 }}>{p.total_registros.toLocaleString('es-PE')}</p>
                    <p style={{ fontSize: 10, color: '#1e3a5a' }}>movimientos</p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: '#c8ddef', margin: 0 }}>{p.productos_procesados}</p>
                    <p style={{ fontSize: 10, color: '#1e3a5a' }}>productos</p>
                  </div>

                  <span style={{ textAlign: 'right', fontSize: 12, color: '#1e3a5a' }}>→</span>
                </div>
              )
            })}
          </div>

          {!loading && procesamientos.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              <button type="button" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,139,221,0.15)', background: 'rgba(56,139,221,0.06)', color: '#2a5a8a', cursor: pagina === 1 ? 'not-allowed' : 'pointer', opacity: pagina === 1 ? 0.35 : 1 }}>
                <IconChevron dir="left" />
              </button>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#2a5a8a', padding: '4px 12px', borderRadius: 6, background: 'rgba(56,139,221,0.08)', border: '1px solid rgba(56,139,221,0.15)' }}>{pagina}</span>
              <button type="button" onClick={() => setPagina(p => p + 1)} disabled={procesamientos.length < LIMIT}
                style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56,139,221,0.15)', background: 'rgba(56,139,221,0.06)', color: '#2a5a8a', cursor: procesamientos.length < LIMIT ? 'not-allowed' : 'pointer', opacity: procesamientos.length < LIMIT ? 0.35 : 1 }}>
                <IconChevron dir="right" />
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}