import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import ModalSaldoInicial from '../components/ModalSaldoInicial'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/* ── Tipos ─────────────────────────────────────────── */
interface Saldo {
  id: number
  codigo: string
  descripcion?: string
  fecha: string
  cantidad: number
  costo_unitario: number
  costo_total: number
}

/* ═══ Icons (solo los de esta página) ═══ */
const IconSpinner = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'kspin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
  </svg>
)
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconEdit = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconTrash = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconSearch = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
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
      cursor: 'pointer', flexShrink: 0,
      transition: 'all .12s',
    }}
  >
    {checked && (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )}
  </span>
)

/* ── Helpers ────────────────────────────────────────── */
const fmt2 = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtFecha = (f: string) => {
  try { return new Date(f + 'T00:00:00').toLocaleDateString('es-PE') } catch { return f }
}

/* ── Página ─────────────────────────────────────────── */
export default function SaldosIniciales() {
  const [saldos,        setSaldos]        = useState<Saldo[]>([])
  const [busqueda,      setBusqueda]      = useState('') // Nuevo estado para la búsqueda
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [saldoEditando, setSaldoEditando] = useState<Saldo | null>(null)
  const [mensaje,       setMensaje]       = useState<string | null>(null)

  //estados para selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [eliminando,  setEliminando]  = useState(false)

  const fetchSaldos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/saldos/`)
      if (!res.ok) throw new Error('Error al cargar saldos')
      setSaldos(await res.json())
      setSelectedIds(new Set())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSaldos() }, [])

    /* ── Selección múltiple ─────────────────────────────── */
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === saldos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(saldos.map(s => s.id)))
    }
  }
  const allSelected  = saldos.length > 0 && selectedIds.size === saldos.length
  const hasSelection = selectedIds.size > 0

  /* ── Eliminar múltiple ──────────────────────────────── */
  const handleEliminarMultiple = async () => {
    if (selectedIds.size === 0) return
    const cantidad = selectedIds.size
    const msg = cantidad === 1
      ? '¿Eliminar este saldo? Esta acción no se puede deshacer.'
      : `¿Eliminar ${cantidad} saldos? Esta acción no se puede deshacer.`

    if (!confirm(msg)) return

    setEliminando(true)
    try {
      const res = await fetch(`${API}/api/v1/saldos/eliminar-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar')

      let texto = data?.mensaje || `${data?.eliminados || 0} eliminado(s)`
      if (data?.advertencia) texto += ' — ' + data.advertencia
      setMensaje(texto)
      await fetchSaldos()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setEliminando(false)
    }
  }

  /* ── Eliminar uno ───────────────────────────────────── */
  const handleEliminar = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este saldo?')) return
    try {
      const res  = await fetch(`${API}/api/v1/saldos/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar')
      if (data?.advertencia) alert(data.advertencia)
      setMensaje(data?.mensaje || 'Eliminado correctamente')
      fetchSaldos()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  /* ── Guardado ───────────────────────────────────────── */
  const handleGuardado = () => {
    setModalOpen(false)
    setSaldoEditando(null)
    fetchSaldos()
  }

  /* ── Filtrado ───────────────────────────────────────── */
  const saldosFiltrados = saldos.filter((s) => {
    const termino = busqueda.toLowerCase()
    return (
      s.codigo.toLowerCase().includes(termino) ||
      (s.descripcion && s.descripcion.toLowerCase().includes(termino))
    )
  })

  /* ── Tabla header style ─────────────────────────────── */
  const th: React.CSSProperties = {
    padding: '8px 12px',
    textAlign: 'left',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: '#4a7a9a',
    background: '#0a1929',
    borderBottom: '1px solid rgba(56,139,221,0.14)',
    fontFamily: "'IBM Plex Mono', monospace",
  }
  const td: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: 12,
    color: '#6a8ab0',
    borderBottom: '1px solid rgba(55,138,221,0.05)',
    fontFamily: "'IBM Plex Mono', monospace",
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#07101e', fontFamily: "'Inter', sans-serif", color: '#c8ddef' }}>

      <Sidebar onAgregarSaldo={() => { setSaldoEditando(null); setModalOpen(true) }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(56,139,221,0.1)',
          background: '#080e1c',
          position: 'sticky' as const, top: 0, zIndex: 30,
        }}>
          <div>
            <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0, lineHeight: 1 }}>
              Saldos Iniciales
            </h1>
            <p style={{ fontSize: 11, color: '#1e3a5a', marginTop: 2 }}>
              Stock base para cálculo CPP
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* ✅ NUEVO: botón eliminar (aparece solo con selección) */}
            {hasSelection && (
              <button
                type="button"
                onClick={handleEliminarMultiple}
                disabled={eliminando}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 13px', borderRadius: 7,
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
              onClick={() => { setSaldoEditando(null); setModalOpen(true) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7,
                border: '1px solid rgba(245,158,11,0.28)',
                background: 'rgba(245,158,11,0.12)',
                color: '#f59e0b',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.22)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
            >
              <IconPlus /> Nuevo saldo
            </button>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Toast mensaje */}
          {mensaje && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 8, padding: '9px 14px',
              fontSize: 12, color: '#4ade80',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <span>✓ {mensaje}</span>
              <button
                onClick={() => setMensaje(null)}
                style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 4px' }}
              >×</button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 12, color: '#fca5a5',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              ✕ {error}
            </div>
          )}

          {/* Tabla */}
          <div style={{
            background: '#0d1525',
            border: '1px solid rgba(56,139,221,0.1)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            {/* Toolbar */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(56,139,221,0.08)',
              background: 'rgba(56,139,221,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 2, height: 12, background: '#f59e0b', borderRadius: 2 }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#1e3a5a', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Saldos registrados
                </span>
                <span style={{
                  fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                  padding: '1px 8px', borderRadius: 20,
                  background: 'rgba(245,158,11,0.12)',
                  border: '1px solid rgba(245,158,11,0.22)',
                  color: '#f59e0b',
                }}>
                  {saldosFiltrados.length}
                </span>
              </div>

              {/* Buscador Integrado */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#07101e',
                border: '1px solid rgba(56,139,221,0.2)',
                borderRadius: 6,
                padding: '5px 10px',
                width: '100%',
                maxWidth: 250,
              }}>
                <span style={{ color: '#4a7a9a', display: 'flex' }}><IconSearch /></span>
                <input
                  type="text"
                  placeholder="Buscar por código o desc..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: '#c8ddef', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 10, color: '#1e3a5a' }}>
                <IconSpinner />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>Cargando saldos...</span>
              </div>
            )}

            {/* Empty */}
            {!loading && saldosFiltrados.length === 0 && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#1e3a5a', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                {saldos.length > 0 ? 'No se encontraron resultados para tu búsqueda' : 'Sin saldos iniciales registrados'}
              </div>
            )}

            {/* Table */}
            {!loading && saldosFiltrados.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {/* NUEVO: columna checkbox */}
                      <th style={{ ...th, width: 40, textAlign: 'center' }}>
                        <Checkbox checked={allSelected} onChange={toggleSelectAll} />
                      </th>
                      <th style={th}>Código</th>
                      <th style={th}>Descripción</th>
                      <th style={th}>Fecha</th>
                      <th style={{ ...th, textAlign: 'right' }}>Cantidad</th>
                      <th style={{ ...th, textAlign: 'right' }}>Costo Unit.</th>
                      <th style={{ ...th, textAlign: 'right' }}>Costo Total</th>
                      <th style={{ ...th, textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saldosFiltrados.map((s, i) => {
  const isSelected = selectedIds.has(s.id)

  return (
    <tr
      key={s.id}
      onMouseEnter={e => {
        if (!isSelected)
          e.currentTarget.style.background = 'rgba(56,139,221,0.07)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isSelected
          ? 'rgba(59,130,246,0.06)'
          : (i % 2 === 0 ? 'transparent' : 'rgba(55,138,221,0.03)')
      }}
      style={{
        background: isSelected
          ? 'rgba(59,130,246,0.06)'
          : (i % 2 === 0 ? 'transparent' : 'rgba(55,138,221,0.03)'),
        transition: 'background .1s'
      }}
    >
                        <td style={{ ...td, textAlign: 'center' }}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelect(s.id)}
                            />
                        </td>
                        <td style={{ ...td, color: '#60a5fa', fontWeight: 600 }}>{s.codigo}</td>
                        <td style={{ ...td, color: '#8aabcc' }}>{s.descripcion || '—'}</td>
                        <td style={td}>{fmtFecha(s.fecha)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{fmt2(s.cantidad)}</td>
                        <td style={{ ...td, textAlign: 'right' }}>{fmt2(s.costo_unitario)}</td>
                        <td style={{ ...td, textAlign: 'right', color: '#c8ddef', fontWeight: 600 }}>{fmt2(s.costo_total)}</td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                            <button
                              onClick={() => { setSaldoEditando(s); setModalOpen(true) }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 6, border: 'none',
                                background: 'rgba(56,139,221,0.12)',
                                color: '#60a5fa',
                                fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,139,221,0.24)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,139,221,0.12)' }}
                            >
                              <IconEdit /> Editar
                            </button>
                            <button
                              onClick={() => handleEliminar(s.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 6, border: 'none',
                                background: 'rgba(239,68,68,0.1)',
                                color: '#f87171',
                                fontSize: 11, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                            >
                              <IconTrash /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                    })
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
            
      {/* Modal */}
      <ModalSaldoInicial
        open={modalOpen}
        empresaId={1}
        onClose={() => { setModalOpen(false); setSaldoEditando(null) }}
        onGuardado={handleGuardado}
        saldoEditar={saldoEditando}
      />
    </div>
  )
}