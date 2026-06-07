import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import toast from 'react-hot-toast'
import ModalProducto from '../components/ModalProducto'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/* ── Tipos ─────────────────────────────────────────── */
interface Producto {
  id: number
  empresa_id: number
  codigo: string
  descripcion?: string
  codigo_existencia?: string
  unidad_medida?: string
  creado_en: string
}

interface Empresa {
  id: number
  nombre: string
}

/* ═══ Icons (Consistentes con tu diseño base) ═══ */
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

/* ═══ Checkbox Nativo Reutilizado ═══ */
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

/* ── Página Principal ───────────────────────────────── */
export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [empresaFiltro, setEmpresaFiltro] = useState<string>('todas')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)

  // Estados para selección múltiple e inyección de modales
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)

  // Cargar catálogo de empresas para el selector de filtros
  const fetchEmpresas = async () => {
    try {
      const res = await fetch(`${API}/api/v1/empresa/`)
      if (res.ok) setEmpresas(await res.json())
    } catch (e) {
      console.error('Error al cargar empresas', e)
    }
  }

  // Cargar listado de productos usando la estructura de paginación de tu Service
  const fetchProductos = async () => {
    setLoading(true)
    try {
      let url = `${API}/api/v1/productos/?limit=200&offset=0`
      if (busqueda.trim()) url += `&search=${encodeURIComponent(busqueda.trim())}`
      if (empresaFiltro !== 'todas') url += `&empresa_id=${empresaFiltro}`

      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar catálogo de productos')
      
      const data = await res.json()
      setProductos(data.productos ?? [])
      setSelectedIds(new Set())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmpresas() }, [])
  useEffect(() => { fetchProductos() }, [busqueda, empresaFiltro])

  /* ── Selección Múltiple ─────────────────────────────── */
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === productos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(productos.map(p => p.id)))
    }
  }

  const allSelected  = productos.length > 0 && selectedIds.size === productos.length
  const hasSelection = selectedIds.size > 0

  /* ── Eliminar Individual ────────────────────────────── */
  const handleEliminar = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este producto? Solo procederá si no cuenta con movimientos registrados en el Kardex.')) return
    try {
      const res = await fetch(`${API}/api/v1/productos/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar el ítem')
      
      setMensaje(data?.mensaje || 'Producto eliminado correctamente')
      fetchProductos()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  /* ── Handlers de Cierre y Éxito de Modales ─────────── */
  const handleGuardado = () => {
    setModalOpen(false)
    setProductoEditando(null)
    fetchProductos()
  }

  /* ── Estilos Heredados Limpios ──────────────────────── */
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

  const selectFiltroStyle: React.CSSProperties = {
    background: '#07101e',
    border: '1px solid rgba(56,139,221,0.2)',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 11,
    color: '#c8ddef',
    fontFamily: "'IBM Plex Mono', monospace",
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#07101e', fontFamily: "'Inter', sans-serif", color: '#c8ddef' }}>
      
      <Sidebar onAgregarSaldo={() => {}} />

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
              Maestro de Productos
            </h1>
            <p style={{ fontSize: 11, color: '#1e3a5a', marginTop: 2, margin: 0 }}>
              Catálogo maestro y asignación corporativa de existencias
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => { setProductoEditando(null); setModalOpen(true) }}
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
              <IconPlus /> Nuevo producto
            </button>
          </div>
        </header>

        {/* Content Panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Notificaciones y Alertas */}
          {mensaje && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 8, padding: '9px 14px', fontSize: 12, color: '#4ade80',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              <span>✓ {mensaje}</span>
              <button onClick={() => setMensaje(null)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fca5a5',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              ✕ {error}
            </div>
          )}

          {/* Tabla Contenedora */}
          <div style={{ background: '#0d1525', border: '1px solid rgba(56,139,221,0.1)', borderRadius: 10, overflow: 'hidden' }}>
            
            {/* Toolbar unificado */}
            <div style={{
              padding: '10px 14px', borderBottom: '1px solid rgba(56,139,221,0.08)',
              background: 'rgba(56,139,221,0.03)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 2, height: 12, background: '#f59e0b', borderRadius: 2 }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#1e3a5a', fontFamily: "'IBM Plex Mono', monospace" }}>
                  Productos en catálogo
                </span>
                <span style={{
                  fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: '1px 8px', borderRadius: 20,
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)', color: '#f59e0b',
                }}>
                  {productos.length}
                </span>
              </div>

              {/* Bloque Integrado de Filtros (Buscador + Selector de Empresa) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                
                {/* Selector de Filtro de Empresa */}
                <select 
                  value={empresaFiltro}
                  onChange={e => setEmpresaFiltro(e.target.value)}
                  style={selectFiltroStyle}
                >
                  <option value="todas">🏢 [Todas las Empresas]</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.id === 1 ? '⚠️ ' : ''}{emp.nombre}
                    </option>
                  ))}
                </select>

                {/* Input Buscador */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: '#07101e',
                  border: '1px solid rgba(56,139,221,0.2)', borderRadius: 6, padding: '5px 10px',
                  width: 200,
                }}>
                  <span style={{ color: '#4a7a9a', display: 'flex' }}><IconSearch /></span>
                  <input
                    type="text"
                    placeholder="Buscar código o desc..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      color: '#c8ddef', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", width: '100%',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Spinner de Carga */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '56px 0', gap: 10, color: '#1e3a5a' }}>
                <IconSpinner />
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>Cargando catálogo...</span>
              </div>
            )}

            {/* Estado Vacío */}
            {!loading && productos.length === 0 && (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#1e3a5a', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                Sin productos registrados en los filtros seleccionados
              </div>
            )}

            {/* Estructura de la Tabla */}
            {!loading && productos.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: 40, textAlign: 'center' }}>
                        <Checkbox checked={allSelected} onChange={toggleSelectAll} />
                      </th>
                      <th style={th}>Código</th>
                      <th style={th}>Descripción</th>
                      <th style={th}>Empresa Asignada</th>
                      <th style={th}>Unidad Medida</th>
                      <th style={th}>Código SUNAT</th>
                      <th style={{ ...th, textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((p, i) => {
                      const isSelected = selectedIds.has(p.id)

                      return (
                        <tr
                          key={p.id}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(56,139,221,0.07)' }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = isSelected
                              ? 'rgba(59,130,246,0.06)'
                              : (i % 2 === 0 ? 'transparent' : 'rgba(55,138,221,0.03)')
                          }}
                          style={{
                            background: isSelected ? 'rgba(59,130,246,0.06)' : (i % 2 === 0 ? 'transparent' : 'rgba(55,138,221,0.03)'),
                            transition: 'background .1s'
                          }}
                        >
                          <td style={{ ...td, textAlign: 'center' }}>
                            <Checkbox checked={isSelected} onChange={() => toggleSelect(p.id)} />
                          </td>
                          <td style={{ ...td, color: '#60a5fa', fontWeight: 600 }}>{p.codigo}</td>
                          <td style={{ ...td, color: '#8aabcc' }}>{p.descripcion || '—'}</td>
                          <td style={td}>
                            {p.empresa_id === 1 ? (
                              <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.08)', padding: '2px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                                ⚠️ SIN ASIGNAR
                              </span>
                            ) : (
                              <span style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)', padding: '2px 7px', borderRadius: 4, fontSize: 11 }}>
                                ASIGNADO (ID: {p.empresa_id})
                              </span>
                            )}
                          </td>
                          <td style={td}>{p.unidad_medida || 'NIU'}</td>
                          <td style={td}>{p.codigo_existencia || '01'}</td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                              <button
                                onClick={() => { setProductoEditando(p); setModalOpen(true) }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: 'rgba(56,139,221,0.12)', color: '#60a5fa',
                                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,139,221,0.24)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,139,221,0.12)' }}
                              >
                                <IconEdit /> Reasignar / Editar
                              </button>
                              
                              <button
                                onClick={() => handleEliminar(p.id)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '4px 10px', borderRadius: 6, border: 'none',
                                  background: 'rgba(239,68,68,0.1)', color: '#f87171',
                                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                              >
                                <IconTrash /> Borrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aquí inyectaremos el modal de creación manual en el siguiente paso */}
      {/* Modal Desplegable */}
     <ModalProducto 
       open={modalOpen}
       onClose={() => { setModalOpen(false); setProductoEditando(null) }}
       onGuardado={handleGuardado}
       productoEditar={productoEditando}
     />
      {/* <ModalProducto open={modalOpen} ... /> */}
    </div>
  )
}