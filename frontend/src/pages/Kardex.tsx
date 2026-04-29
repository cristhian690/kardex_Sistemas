import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useKardex } from '../hooks/useKardex'
import KardexTable   from '../components/KardexTable'
import AlertaBanner  from '../components/AlertaBanner'
import BadgeProducto from '../components/BadgeProducto'
import type { FiltroFecha as IFiltroFecha } from '../types'

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
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconFilter = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
)
const IconProducts = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
)
const IconSaldos = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IconSpinner = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'kspin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
  </svg>
)

/* ═══════════════════════════ Sidebar ═══════════════════════════ */
const SIDEBAR_W = 200

interface SidebarProps {
  id: number
  onNavigate: (path: string) => void
  currentPath: string
}

const Sidebar = ({ id, onNavigate, currentPath }: SidebarProps) => {
  const navItem = (
    label: string,
    icon: React.ReactNode,
    path: string,
    active: boolean,
    dot?: string,
  ) => (
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
        transition: 'background .12s, color .12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      {!dot && <span style={{ color: active ? '#60a5fa' : '#3a5a7a', flexShrink: 0 }}>{icon}</span>}
      {label}
      {active && <span style={{ marginLeft: 'auto', width: 3, height: 14, background: '#3b82f6', borderRadius: 2, flexShrink: 0 }} />}
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
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 16px' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0,
        }}>
          <IconBox />
        </div>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: '#e2e8f0', letterSpacing: '.08em' }}>KARDEX</div>
          <div style={{ fontSize: 9, color: '#2a4a6a', letterSpacing: '.1em' }}>Sistema CPP</div>
        </div>
      </div>

      {/* Principal */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>
        Principal
      </div>
      {navItem('Dashboard',  <IconGrid />,    `/kardex/${id}`,   currentPath === `/kardex/${id}`,   '#3b82f6')}
      {navItem('Procesar',   <IconUpload />,  '/',               currentPath === '/')}
      {navItem('Actividad',  <IconHistory />, '/historial',      currentPath === '/historial')}

      <div style={{ height: 1, background: 'rgba(56,139,221,0.08)', margin: '10px 0' }} />

      {/* Análisis */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>
        Análisis
      </div>
      {navItem('Movimientos',   <IconList />,     `/kardex/${id}`,   true)}
      {navItem('Verificación',  <IconShield />,   `/kardex/${id}`,   false)}
      {navItem('Exportar',      <IconDownload />, `/kardex/${id}`,   false)}

      <div style={{ height: 1, background: 'rgba(56,139,221,0.08)', margin: '10px 0' }} />

      {/* Sistema */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.15em', color: '#1e3a5a', textTransform: 'uppercase' as const, padding: '6px 10px 4px' }}>
        Sistema
      </div>
      {navItem('Saldos',    <IconSaldos />,   `/kardex/${id}`, false)}
      {navItem('Productos', <IconProducts />, `/kardex/${id}`, false)}
    </aside>
  )
}

/* ═══════════════════════════ Mini sparkline SVG ═══════════════════════════ */
const Sparkline = ({ color }: { color: string }) => {
  const pts = [20, 35, 28, 50, 42, 60, 55, 70, 65, 80, 72, 88]
  const w = 90, h = 36
  const max = Math.max(...pts), min = Math.min(...pts)
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w)
  const ys = pts.map(p => h - ((p - min) / (max - min)) * h * 0.8 - h * 0.1)
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ opacity: 0.6 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ═══════════════════════════ MetricCard ═══════════════════════════ */
interface MetricCardProps {
  label: string
  value: string
  sub: string
  color: string
  sparkColor: string
  borderColor: string
}

const MetricCard = ({ label, value, sub, color, sparkColor, borderColor }: MetricCardProps) => (
  <div style={{
    flex: 1,
    background: '#0d1525',
    border: `1px solid ${borderColor}`,
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: 2,
    position: 'relative' as const, overflow: 'hidden',
    minWidth: 0,
  }}>
    <p style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '.16em',
      textTransform: 'uppercase' as const, color: '#2a4a6a',
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {label}
    </p>
    <p style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 26, fontWeight: 800,
      color, lineHeight: 1, marginTop: 2,
      letterSpacing: '-.01em',
    }}>
      {value}
    </p>
    <p style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10, color: '#1e3a5a', marginTop: 2,
    }}>
      {sub}
    </p>
    <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
      <Sparkline color={sparkColor} />
    </div>
  </div>
)

/* ═══════════════════════════ Formatters ═══════════════════════════ */
const _nf2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt  = (n: number) => _nf2.format(Math.round(n * 100) / 100)
const fmtS = (n: number) => `S/ ${_nf2.format(Math.round(n * 100) / 100)}`

/* ═══════════════════════════ Page ═══════════════════════════ */
export default function Kardex() {
  const { procesamiento_id } = useParams<{ procesamiento_id: string }>()
  const navigate             = useNavigate()
  const location             = useLocation()

  const {
    movimientos, metricas, alertas,
    loading, error, exporting,
    totalRegistros, erroresIntegridad,
    cargarKardex, descargarExcel,
  } = useKardex()

  const [codigo,          setCodigo]          = useState('')
  const [filtroFecha,     setFiltroFecha]     = useState<IFiltroFecha>({ modo: 'anio_mes' })
  const [mostrarSemaforo, setMostrarSemaforo] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true)

  const id = Number(procesamiento_id)

  useEffect(() => {
    if (!id) return
    cargarKardex(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleBuscarCodigo = (cod: string) => {
    setCodigo(cod)
    cargarKardex(id, { ...filtroFecha, codigo: cod || undefined })
  }
  const handleCambiarFecha = (nuevoFiltro: IFiltroFecha) => {
    setFiltroFecha(nuevoFiltro)
    cargarKardex(id, { ...nuevoFiltro, codigo: codigo || undefined })
  }
  const handleExportar = () =>
    descargarExcel(codigo || undefined, filtroFecha.fecha_desde, filtroFecha.fecha_hasta)

  const codigosVisibles = useMemo(() => {
    const set = new Set(movimientos.map(m => m.codigo).filter(Boolean))
    return Array.from(set) as string[]
  }, [movimientos])

  if (!id) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07101e', color: '#2a4a6a', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
      ID de procesamiento inválido.
    </div>
  )

  /* ── filter input styles ── */
  const filterInputStyle: React.CSSProperties = {
    background: 'rgba(56,139,221,0.06)',
    border: '1px solid rgba(56,139,221,0.18)',
    borderRadius: 5, padding: '3px 8px',
    fontSize: 11, color: '#c8ddef',
    fontFamily: "'IBM Plex Mono', monospace",
    outline: 'none', height: 26,
  }
  const filterSelectStyle: React.CSSProperties = {
    background: 'rgba(56,139,221,0.06)',
    border: '1px solid rgba(56,139,221,0.18)',
    borderRadius: 5, padding: '3px 6px',
    fontSize: 11, color: '#c8ddef',
    outline: 'none', height: 26,
  }

  /* ── shared token ── */
  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 7,
    fontSize: 11, fontWeight: 600,
    fontFamily: "'Inter', sans-serif", cursor: 'pointer',
    transition: 'opacity .12s',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: '#07101e',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#c8ddef',
    }}>

      {/* ── SIDEBAR ── */}
      <Sidebar id={id} onNavigate={navigate} currentPath={location.pathname} />

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── TOPBAR ── */}
        <header style={{
          height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(56,139,221,0.1)',
          background: '#080e1c',
          gap: 12,
          position: 'sticky' as const, top: 0, zIndex: 30,
        }}>
          {/* Title */}
          <div>
            <h1 style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 18, fontWeight: 700,
              color: '#e2e8f0', margin: 0, lineHeight: 1,
              letterSpacing: '-.01em',
            }}>
              Kardex{' '}
              <span style={{ color: '#2563eb' }}>#{id}</span>
            </h1>
            <p style={{ fontSize: 11, color: '#1e3a5a', marginTop: 3 }}>
              {totalRegistros.toLocaleString('es-PE')} registros cargados
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {erroresIntegridad > 0 && (
              <span style={{
                ...btnBase,
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#fbbf24', cursor: 'default',
              }}>
                ⚠ {erroresIntegridad} anomalía{erroresIntegridad > 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => setFiltrosAbiertos(v => !v)}
              style={{
                ...btnBase,
                background: filtrosAbiertos ? 'rgba(56,139,221,0.15)' : 'rgba(56,139,221,0.06)',
                border: filtrosAbiertos ? '1px solid rgba(56,139,221,0.35)' : '1px solid rgba(56,139,221,0.14)',
                color: filtrosAbiertos ? '#60a5fa' : '#2a5a8a',
              }}
            >
              <IconFilter /> Filtros
            </button>
            <button
              type="button"
              onClick={() => setMostrarSemaforo(v => !v)}
              style={{
                ...btnBase,
                background: mostrarSemaforo ? 'rgba(245,158,11,0.12)' : 'rgba(56,139,221,0.06)',
                border: mostrarSemaforo ? '1px solid rgba(245,158,11,0.28)' : '1px solid rgba(56,139,221,0.14)',
                color: mostrarSemaforo ? '#fbbf24' : '#2a5a8a',
              }}
            >
              <IconShield /> Verificación
            </button>
            <button
              type="button"
              onClick={handleExportar}
              disabled={exporting || movimientos.length === 0}
              style={{
                ...btnBase,
                background: 'linear-gradient(135deg,#1d4ed8,#1e3a8a)',
                border: 'none',
                color: '#e2e8f0',
                boxShadow: '0 2px 10px rgba(29,78,216,0.4)',
                opacity: (exporting || movimientos.length === 0) ? 0.4 : 1,
                cursor: (exporting || movimientos.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {exporting ? <IconSpinner /> : <IconDownload />}
              Exportar Excel
            </button>
          </div>
        </header>

        {/* ── SCROLLABLE CONTENT ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Alertas */}
          {alertas && <AlertaBanner alertas={alertas} erroresIntegridad={erroresIntegridad} />}

          {/* ── Métricas ── */}
          {metricas && (
            <div style={{ display: 'flex', gap: 12 }}>
              <MetricCard
                label="Total registros"
                value={totalRegistros.toLocaleString('es-PE')}
                sub="movimientos"
                color="#c8ddef"
                sparkColor="#3b82f6"
                borderColor="rgba(56,139,221,0.15)"
              />
              <MetricCard
                label="Total entradas"
                value={fmtS(metricas.total_ent_costo)}
                sub={`${fmt(metricas.total_ent_cantidad)} uds`}
                color="#3b82f6"
                sparkColor="#3b82f6"
                borderColor="rgba(59,130,246,0.25)"
              />
              <MetricCard
                label="Total salidas"
                value={fmtS(metricas.total_sal_costo)}
                sub={`${fmt(metricas.total_sal_cantidad)} uds`}
                color="#f87171"
                sparkColor="#ef4444"
                borderColor="rgba(239,68,68,0.25)"
              />
              <MetricCard
                label="Saldo final"
                value={fmtS(metricas.saldo_final_costo)}
                sub={`${fmt(metricas.saldo_final_cantidad)} uds`}
                color="#fbbf24"
                sparkColor="#f59e0b"
                borderColor="rgba(245,158,11,0.25)"
              />
            </div>
          )}

          {/* ── Filtros ── */}
          {filtrosAbiertos && (
            <div style={{
              background: '#0d1525',
              border: '1px solid rgba(56,139,221,0.12)',
              borderRadius: 10, padding: '0 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              height: 56, flexShrink: 0,
            }}>
              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingRight: 10, borderRight: '1px solid rgba(56,139,221,0.1)' }}>
                <div style={{ width: 2, height: 12, background: '#3b82f6', borderRadius: 2 }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#2a4a6a', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Filtros
                </span>
              </div>

              {/* Código */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#2a5a7a', flexShrink: 0 }}>Código</span>
                <input
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleBuscarCodigo(codigo) }}
                  placeholder="Ej: 011039"
                  disabled={loading}
                  style={{ ...filterInputStyle, width: 100 }}
                />
                {codigo && (
                  <button
                    onClick={() => { setCodigo(''); handleBuscarCodigo('') }}
                    style={{ background: 'none', border: 'none', color: '#2a5a7a', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                  >×</button>
                )}
              </div>

              <div style={{ width: 1, height: 20, background: 'rgba(56,139,221,0.1)', flexShrink: 0 }} />

              {/* Modo */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {(['anio_mes', 'exacta', 'rango'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => handleCambiarFecha({ ...filtroFecha, modo: m })}
                    disabled={loading}
                    style={{
                      padding: '3px 8px', borderRadius: 4, border: 'none',
                      background: filtroFecha.modo === m ? 'rgba(59,130,246,0.2)' : 'rgba(56,139,221,0.06)',
                      color: filtroFecha.modo === m ? '#60a5fa' : '#2a5a7a',
                      fontSize: 10, fontWeight: filtroFecha.modo === m ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {{ anio_mes: 'Año/Mes', exacta: 'Exacta', rango: 'Rango' }[m]}
                  </button>
                ))}
              </div>

              <div style={{ width: 1, height: 20, background: 'rgba(56,139,221,0.1)', flexShrink: 0 }} />

              {/* Controles de fecha */}
              {filtroFecha.modo === 'anio_mes' && (
                <>
                  <select
                    value={filtroFecha.anio ?? ''}
                    onChange={e => handleCambiarFecha({ ...filtroFecha, anio: e.target.value ? Number(e.target.value) : undefined })}
                    disabled={loading}
                    style={filterSelectStyle}
                  >
                    <option value="">Año</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <select
                    value={filtroFecha.mes ?? ''}
                    onChange={e => handleCambiarFecha({ ...filtroFecha, mes: e.target.value ? Number(e.target.value) : undefined })}
                    disabled={loading || !filtroFecha.anio}
                    style={filterSelectStyle}
                  >
                    <option value="">Mes</option>
                    {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'].map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </>
              )}

              {filtroFecha.modo === 'exacta' && (
                <input
                  type="date"
                  value={filtroFecha.fecha_exacta ?? ''}
                  onChange={e => handleCambiarFecha({ ...filtroFecha, fecha_exacta: e.target.value || undefined })}
                  disabled={loading}
                  style={filterInputStyle}
                />
              )}

              {filtroFecha.modo === 'rango' && (
                <>
                  <input type="date" value={filtroFecha.fecha_desde ?? ''} onChange={e => handleCambiarFecha({ ...filtroFecha, fecha_desde: e.target.value || undefined })} disabled={loading} style={filterInputStyle} />
                  <span style={{ fontSize: 11, color: '#2a5a7a' }}>–</span>
                  <input type="date" value={filtroFecha.fecha_hasta ?? ''} onChange={e => handleCambiarFecha({ ...filtroFecha, fecha_hasta: e.target.value || undefined })} disabled={loading} style={filterInputStyle} />
                </>
              )}
            </div>
          )}

          {/* ── Badges ── */}
          {codigosVisibles.length > 0 && (
            <BadgeProducto codigos={codigosVisibles} />
          )}

          {/* ── Error ── */}
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

          {/* ── Tabla ── */}
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
                <div style={{ width: 2, height: 12, background: '#3b82f6', borderRadius: 2 }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#1e3a5a', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Movimientos
                </span>
                <span style={{
                  fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
                  padding: '1px 8px', borderRadius: 20,
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  color: '#60a5fa',
                }}>
                  {movimientos.length.toLocaleString('es-PE')}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {mostrarSemaforo && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: '#1e3a5a' }}>
                    {[
                      { color: '#22c55e', label: 'OK' },
                      { color: '#f59e0b', label: 'Error B' },
                      { color: '#ef4444', label: 'Error A' },
                    ].map(item => (
                      <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  <span style={{ fontSize: 10, color: '#1e3a5a' }}>En línea</span>
                </div>
              </div>
            </div>

            {/* Body */}
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 10, color: '#1e3a5a' }}>
                <IconSpinner />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>Cargando movimientos...</span>
              </div>
            ) : (
              <KardexTable movimientos={movimientos} mostrarSemaforo={mostrarSemaforo} />
            )}

            {/* Footer */}
            {movimientos.length > 0 && (
              <div style={{
                padding: '7px 14px',
                borderTop: '1px solid rgba(56,139,221,0.08)',
                background: 'rgba(56,139,221,0.02)',
              }}>
                <p style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: '#1e3a5a' }}>
                  Mostrando {movimientos.length.toLocaleString('es-PE')} de {totalRegistros.toLocaleString('es-PE')} registros
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}