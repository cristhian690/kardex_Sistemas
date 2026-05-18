
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import FileUploader       from '../components/FileUploader'
import ModalSaldoInicial  from '../components/ModalSaldoInicial'
import { useKardex }      from '../hooks/useKardex'
import { useAuth }        from '../context/AuthContext'
import type { Usuario }   from '../types'

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
const IconTrend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
)
const IconSpinner = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'kspin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
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
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconLogout = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

/* ═══════════════════════════ Helpers ═══════════════════════════ */
const getInitials = (user: Usuario | null): string => {
  if (!user) return '?'
  const fuente = user.nombre_completo || user.username
  return fuente
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

/* ═══════════════════════════ Sidebar ═══════════════════════════ */
const SIDEBAR_W = 200

/* Badge "Pronto" */
const BadgePronto = () => (
  <span style={{
    marginLeft: 'auto',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(148,163,184,0.08)',
    border: '1px solid rgba(148,163,184,0.18)',
    color: '#64748b',
    flexShrink: 0,
  }}>
    Pronto
  </span>
)

const Sidebar = ({ onNavigate, currentPath, onAgregarSaldo, user, onLogout }: {
  onNavigate:      (p: string) => void
  currentPath:     string
  onAgregarSaldo:  () => void
  user:            Usuario | null
  onLogout:        () => void
}) => {
  /**
   * navItem soporta 3 estados:
   * - activo: ruta actual
   * - normal: clickeable
   * - disabled: "Pronto", no clickeable
   */
  const navItem = (
    label: string,
    icon: React.ReactNode,
    path: string,
    active: boolean,
    disabled: boolean = false,
  ) => (
    <button
      type="button"
      onClick={() => { if (!disabled) onNavigate(path) }}
      disabled={disabled}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', borderRadius: 6, border: 'none',
        background: active ? 'rgba(56,139,221,0.15)' : 'transparent',
        color: disabled ? '#2a4a6a' : (active ? '#60a5fa' : '#4a6a8a'),
        fontSize: 12, fontWeight: active ? 600 : 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left' as const,
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!active && !disabled) e.currentTarget.style.background = 'transparent' }}
      title={disabled ? 'Próximamente disponible' : undefined}
    >
      <span style={{ color: disabled ? '#1e3a5a' : (active ? '#60a5fa' : '#3a5a7a'), flexShrink: 0 }}>{icon}</span>
      {label}
      {disabled && <BadgePronto />}
      {active && !disabled && <span style={{ marginLeft: 'auto', width: 3, height: 14, background: '#3b82f6', borderRadius: 2 }} />}
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
      {navItem('Dashboard',  <IconGrid />,    '/',           false, true)}
      {navItem('Procesar',   <IconUpload />,  '/',           currentPath === '/')}
      {navItem('Actividad',  <IconHistory />, '/historial',  currentPath === '/historial')}

      <div style={{ height: 1, background: 'rgba(56,139,221,0.08)', margin: '10px 0' }} />

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>Análisis</div>
      {navItem('Movimientos',  <IconList />,     '/', false, true)}
      {navItem('Verificación', <IconShield />,   '/', false, true)}
      {navItem('Exportar',     <IconDownload />, '/', false, true)}

      <div style={{ height: 1, background: 'rgba(56,139,221,0.08)', margin: '10px 0' }} />

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>Sistema</div>

      {/* Saldos — item + botón "+" en la misma fila */}
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
            width: 22, height: 22,
            borderRadius: 5,
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

      {navItem('Productos', <IconProducts />, '/', false, true)}

      {/* ═══ Bloque CUENTA — empujado al fondo ═══ */}
      <div style={{ flex: 1 }} />

      <div style={{ height: 1, background: 'rgba(56,139,221,0.08)', margin: '10px 0' }} />

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>Cuenta</div>

      {/* Avatar + nombre + rol */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', marginBottom: 6,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#e2e8f0',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11, fontWeight: 700,
          flexShrink: 0,
        }}>
          {getInitials(user)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#c8ddef',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user?.nombre_completo || user?.username || '—'}
          </div>
          <div style={{
            fontSize: 9, color: '#2a4a6a',
            textTransform: 'uppercase' as const, letterSpacing: '.1em',
          }}>
            {user?.rol || '—'}
          </div>
        </div>
      </div>

      {/* Botón Cerrar sesión */}
      <button
        type="button"
        onClick={onLogout}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 6,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.18)',
          color: '#fca5a5',
          fontSize: 12, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'left' as const,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)' }}
      >
        <IconLogout />
        Cerrar sesión
      </button>
    </aside>
  )
}

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { subirArchivos, uploading } = useKardex()

  const [archivosMovimientos, setArchivosMovimientos] = useState<File[]>([])
  const [archivoSaldos,       setArchivoSaldos]       = useState<File[]>([])
  const [modalSaldoOpen,      setModalSaldoOpen]      = useState(false)

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) {
      toast.success('Sesión cerrada')
      logout()
    }
  }

  const handleProcesar = async () => {
    if (archivosMovimientos.length === 0) return
    const toastId = toast.loading('Procesando Kardex…')
    try {
      const resultado = await subirArchivos(archivosMovimientos, archivoSaldos[0] ?? null)
      if (resultado) {
        toast.success(`Kardex procesado: ${resultado.total_registros ?? 'OK'} registros`, { id: toastId })
        navigate(`/kardex/${resultado.procesamiento_id}`)
      } else {
        toast.error('No se pudo procesar el Kardex', { id: toastId })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al procesar el Kardex', { id: toastId })
    }
  }

  const listo = archivosMovimientos.length > 0

  const card = (topColor: string): React.CSSProperties => ({
    background: '#0d1525',
    border: `1px solid rgba(56,139,221,0.12)`,
    borderTop: `2px solid ${topColor}`,
    borderRadius: 10,
    padding: '32px',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#07101e', fontFamily: "'Inter', sans-serif", color: '#c8ddef' }}>

      <Sidebar
        onNavigate={navigate}
        currentPath={location.pathname}
        onAgregarSaldo={() => setModalSaldoOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Modal saldo inicial */}
      <ModalSaldoInicial
        open={modalSaldoOpen}
        onClose={() => setModalSaldoOpen(false)}
        onGuardado={() => toast.success('Saldo inicial guardado correctamente')}      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(56,139,221,0.1)', background: '#080e1c', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0, lineHeight: 1 }}>
              Procesar Kardex
            </h1>
            <p style={{ fontSize: 11, color: '#1e3a5a', marginTop: 2 }}>
              Importa tus archivos Excel para calcular inventario con CPP
            </p>
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Cards upload */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            {/* ── Saldos ── */}
            <div style={card('#f59e0b')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: '#d97706', textTransform: 'uppercase' as const, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
                    Opcional
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Saldos iniciales</div>
                  <div style={{ fontSize: 12, color: '#2a4a6a', marginTop: 2 }}>Stock base al inicio del período</div>
                </div>

                {/* Botón + manual */}
                <button
                  type="button"
                  onClick={() => setModalSaldoOpen(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 6,
                    background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#f59e0b',
                    fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.22)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
                  title="Agregar saldo inicial manualmente"
                >
                  <IconPlus /> Manual
                </button>
              </div>
              <div style={{ minHeight: 160 }}>
                <FileUploader label="" multiple={false} files={archivoSaldos} onChange={setArchivoSaldos} disabled={uploading} description="Un archivo .xlsx con los saldos base" />
              </div>
            </div>

            {/* ── Movimientos ── */}
            <div style={card('#3b82f6')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: '#60a5fa', textTransform: 'uppercase' as const, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
                    Requerido
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Movimientos</div>
                  <div style={{ fontSize: 12, color: '#2a4a6a', marginTop: 2 }}>Ventas, compras y devoluciones</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconTrend />
                </div>
              </div>
              <div style={{ minHeight: 160 }}>
                <FileUploader label="" multiple={true} files={archivosMovimientos} onChange={setArchivosMovimientos} disabled={uploading} description="Uno o más archivos .xlsx de movimientos" />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={handleProcesar}
              disabled={!listo || uploading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: listo && !uploading ? 'linear-gradient(135deg,#1d4ed8,#1e3a8a)' : 'rgba(56,139,221,0.1)',
                color: listo && !uploading ? '#e2e8f0' : '#2a5a8a',
                fontSize: 13, fontWeight: 600, cursor: listo && !uploading ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                boxShadow: listo && !uploading ? '0 2px 12px rgba(29,78,216,0.35)' : 'none',
              }}
            >
              {uploading ? <><IconSpinner /> Procesando...</> : <><IconUpload /> Procesar Kardex</>}
            </button>
            {!listo && !uploading && (
              <span style={{ fontSize: 12, color: '#1e3a5a' }}>Agrega al menos un archivo de movimientos</span>
            )}
          </div>

          {/* Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 'auto' }}>
            {[
              { n: '01', label: 'Saldos iniciales', sub: 'Stock base del período',      color: '#f59e0b' },
              { n: '02', label: 'Movimientos',       sub: 'Ventas, compras, dev.',       color: '#3b82f6' },
              { n: '03', label: 'Cálculo CPP',       sub: 'Costo Promedio Ponderado',    color: '#22c55e' },
              { n: '04', label: 'Exportar reporte',  sub: 'Excel procesado listo',       color: '#a78bfa' },
            ].map(s => (
              <div key={s.n} style={{ background: '#0d1525', border: '1px solid rgba(56,139,221,0.1)', borderRadius: 8, padding: '24px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 8, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c8ddef' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#2a4a6a', marginTop: 4 }}>{s.sub}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}