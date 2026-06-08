import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import FileUploader from '../components/FileUploader'
import ModalSaldoInicial from '../components/ModalSaldoInicial'
import { useKardex } from '../hooks/useKardex'

const IconUpload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
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
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconBuilding = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M3 7v14M21 7v14M6 3h12l3 4H3L6 3zM9 21V11h6v10"/>
  </svg>
)

interface Empresa {
  id:     number
  nombre: string
  ruc:    string
}

export default function Home() {
  const navigate = useNavigate()
  const { subirArchivos, uploading } = useKardex()

  const [archivosMovimientos, setArchivosMovimientos] = useState<File[]>([])
  const [archivoSaldos,       setArchivoSaldos]       = useState<File[]>([])
  const [modalSaldoOpen,      setModalSaldoOpen]       = useState(false)
  const [empresas,            setEmpresas]             = useState<Empresa[]>([])
  const [empresaId,           setEmpresaId]            = useState<number | null>(null)

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
    fetch(`${API}/api/v1/empresa/selector`)
      .then(r => r.json())
      .then((lista: Empresa[]) => {
        setEmpresas(lista)
      })
      .catch(() => {})
  }, [])

  const handleProcesar = async () => {
    if (archivosMovimientos.length === 0) return
    const toastId = toast.loading('Procesando Catálogo Universal…')
    try {
      const resultado = await subirArchivos(
        archivosMovimientos,
        archivoSaldos[0] ?? null,
        empresaId ?? undefined,
      )
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
  const empresaSeleccionada = empresas.find(e => e.id === empresaId)

  const card = (topColor: string): React.CSSProperties => ({
    background: '#0d1525',
    border: `1px solid rgba(56,139,221,0.12)`,
    borderTop: `2px solid ${topColor}`,
    borderRadius: 10,
    padding: '32px',
  })

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#07101e', fontFamily: "'Inter', sans-serif", color: '#c8ddef' }}>

      <Sidebar onAgregarSaldo={() => setModalSaldoOpen(true)} />

      <ModalSaldoInicial
        open={modalSaldoOpen}
        empresaId={empresaId ?? 1}
        onClose={() => setModalSaldoOpen(false)}
        saldoEditar={null}
        onGuardado={() => toast.success('Saldo inicial guardado correctamente')}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(56,139,221,0.1)', background: '#080e1c', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 700, color: '#e2e8f0', margin: 0, lineHeight: 1 }}>
              Procesar Kardex Universal
            </h1>
            <p style={{ fontSize: 11, color: '#1e3a5a', marginTop: 2, margin: 0 }}>
              {empresaSeleccionada
                ? `Empresa destino: ${empresaSeleccionada.nombre}`
                : "Importación automática — productos nuevos irán a SIN ASIGNAR"
              }
            </p>
          </div>

          {/* ── Selector de empresa ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#2a5a8a', flexShrink: 0 }}><IconBuilding /></span>
            <div style={{ position: 'relative' as const }}>
              <select
                value={empresaId ?? ''}
                onChange={e => setEmpresaId(e.target.value ? Number(e.target.value) : null)}
                style={{
                  background: empresaId ? 'rgba(59,130,246,0.12)' : 'rgba(56,139,221,0.06)',
                  border: empresaId ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(56,139,221,0.18)',
                  borderRadius: 7,
                  color: empresaId ? '#60a5fa' : '#4a6a8a',
                  fontSize: 11,
                  fontWeight: empresaId ? 600 : 400,
                  fontFamily: 'inherit',
                  padding: '5px 28px 5px 10px',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none' as const,
                  minWidth: 180,
                }}
              >
                <option value="">Sin empresa (SIN ASIGNAR)</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} — {e.ruc}
                  </option>
                ))}
              </select>
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke={empresaId ? '#60a5fa' : '#4a6a8a'} strokeWidth="2"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {empresaId && (
              <button
                type="button"
                onClick={() => setEmpresaId(null)}
                title="Quitar selección"
                style={{ background: 'none', border: 'none', color: '#4a6a8a', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
              >×</button>
            )}
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

            <div style={card('#f59e0b')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', color: '#d97706', textTransform: 'uppercase' as const, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
                    Opcional
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Saldos iniciales</div>
                  <div style={{ fontSize: 12, color: '#2a4a6a', marginTop: 2 }}>Stock base al inicio del período</div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalSaldoOpen(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.22)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)' }}
                >
                  <IconPlus /> Manual
                </button>
              </div>
              <div style={{ minHeight: 160 }}>
                <FileUploader label="" multiple={false} files={archivoSaldos} onChange={setArchivoSaldos} disabled={uploading} description="Un archivo .xlsx con los saldos base" />
              </div>
            </div>

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
                fontSize: 13, fontWeight: 600,
                cursor: listo && !uploading ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                boxShadow: listo && !uploading ? '0 2px 12px rgba(29,78,216,0.35)' : 'none',
              }}
            >
              {uploading ? <><IconSpinner /> Procesando...</> : <><IconUpload /> Procesar Kardex</>}
            </button>
            {!listo && !uploading && (
              <span style={{ fontSize: 12, color: '#1e3a5a' }}>
                Agrega al menos un archivo de movimientos para activar el motor
              </span>
            )}
            {listo && empresaId && (
              <span style={{ fontSize: 12, color: '#60a5fa' }}>
                → Los productos se asignarán a <strong>{empresaSeleccionada?.nombre}</strong>
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 'auto' }}>
            {[
              { n: '01', label: 'Saldos iniciales', sub: 'Stock base del período',   color: '#f59e0b' },
              { n: '02', label: 'Movimientos',       sub: 'Ventas, compras, dev.',    color: '#3b82f6' },
              { n: '03', label: 'Cálculo CPP',       sub: 'Costo Promedio Ponderado', color: '#22c55e' },
              { n: '04', label: 'Exportar reporte',  sub: 'Excel procesado listo',    color: '#a78bfa' },
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