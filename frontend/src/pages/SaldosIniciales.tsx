import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

/* ═══════════════════════════ Icons ═══════════════════════════ */
const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
)
const IconGrid = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)
const IconUpload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)
const IconHistory = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>
  </svg>
)
const IconList = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)
const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconSaldos = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IconProducts = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
)
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconSpinner = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'kspin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
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

/* ═══════════════════════════ Sidebar ═══════════════════════════ */
const SIDEBAR_W = 200

const Sidebar = ({ onNavigate, currentPath, onAgregarSaldo }: {
  onNavigate:     (p: string) => void
  currentPath:    string
  onAgregarSaldo: () => void
}) => {
  const navItem = (label: string, icon: React.ReactNode, path: string, active: boolean) => (
    <button
      type="button"
      onClick={() => onNavigate(path)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 6, border: 'none',
        background: active ? 'rgba(56,139,221,0.15)' : 'transparent',
        color: active ? '#60a5fa' : '#4a6a8a',
        fontSize: 12, fontWeight: active ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit',
        textAlign: 'left' as const,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: active ? '#60a5fa' : '#3a5a7a', flexShrink: 0 }}>{icon}</span>
      {label}
      {active && <span style={{ marginLeft: 'auto', width: 3, height: 14, background: '#3b82f6', borderRadius: 2 }} />}
    </button>
  )

  return (
    <aside style={{
      width: SIDEBAR_W, flexShrink: 0,
      background: '#080e1c',
      borderRight: '1px solid rgba(56,139,221,0.1)',
      padding: '12px 10px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 16px' }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
          <IconBox />
        </div>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: '#e2e8f0', letterSpacing: '.08em' }}>KARDEX</div>
          <div style={{ fontSize: 9, color: '#2a4a6a', letterSpacing: '.1em' }}>Sistema CPP</div>
        </div>
      </div>

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>Principal</div>
      {navItem('Dashboard',  <IconGrid />,    '/',           false)}
      {navItem('Procesar',   <IconUpload />,  '/',           currentPath === '/')}
      {navItem('Actividad',  <IconHistory />, '/historial',  currentPath === '/historial')}

      <div style={{ height: 1, background: 'rgba(56,139,221,0.08)', margin: '10px 0' }} />

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>Análisis</div>
      {navItem('Movimientos',  <IconList />,     '/', false)}
      {navItem('Verificación', <IconShield />,   '/', false)}
      {navItem('Exportar',     <IconDownload />, '/', false)}

      <div style={{ height: 1, background: 'rgba(56,139,221,0.08)', margin: '10px 0' }} />

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>Sistema</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <div style={{ flex: 1 }}>
          {navItem('Saldos', <IconSaldos />, '/saldos', currentPath === '/saldos')}
        </div>
        <button
          type="button"
          onClick={onAgregarSaldo}
          title="Agregar saldo inicial manual"
          style={{
            flexShrink: 0,
            width: 22, height: 22, borderRadius: 5,
            border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)',
            color: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.18)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)' }}
        >
          <IconPlus />
        </button>
      </div>

      {navItem('Productos', <IconProducts />, '/', false)}
    </aside>
  )
}

/* ── Helpers ────────────────────────────────────────── */
const fmt2 = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtFecha = (f: string) => {
  try { return new Date(f + 'T00:00:00').toLocaleDateString('es-PE') } catch { return f }
}

/* ── Página ─────────────────────────────────────────── */
export default function SaldosIniciales() {
  const navigate = useNavigate()
  const location = useLocation()

  const [saldos,        setSaldos]        = useState<Saldo[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [saldoEditando, setSaldoEditando] = useState<Saldo | null>(null)
  const [mensaje,       setMensaje]       = useState<string | null>(null)

  /* ── Fetch ──────────────────────────────────────────── */
  const fetchSaldos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/saldos/`)
      if (!res.ok) throw new Error('Error al cargar saldos')
      setSaldos(await res.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSaldos() }, [])

  /* ── Eliminar ───────────────────────────────────────── */
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

      <Sidebar
        onNavigate={navigate}
        currentPath={location.pathname}
        onAgregarSaldo={() => { setSaldoEditando(null); setModalOpen(true) }}
      />

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

          <button
            type="button"
            onClick={() => { setSaldoEditando(null); setModalOpen(true) }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 7, border: 'none',
              background: 'rgba(245,158,11,0.12)',
              border2: '1px solid rgba(245,158,11,0.28)',
              color: '#f59e0b',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            } as React.CSSProperties}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
          >
            <IconPlus /> Nuevo saldo
          </button>
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
                  {saldos.length}
                </span>
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
            {!loading && saldos.length === 0 && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#1e3a5a', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                Sin saldos iniciales registrados
              </div>
            )}

            {/* Table */}
            {!loading && saldos.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
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
                    {saldos.map((s, i) => (
                      <tr
                        key={s.id}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,139,221,0.07)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(55,138,221,0.03)' }}
                        style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(55,138,221,0.03)', transition: 'background .1s' }}
                      >
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
                    ))}
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
        onClose={() => { setModalOpen(false); setSaldoEditando(null) }}
        onGuardado={handleGuardado}
        codigoInicial={saldoEditando?.codigo}
      />
    </div>
  )
}
