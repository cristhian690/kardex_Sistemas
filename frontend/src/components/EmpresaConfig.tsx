import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Empresa {
  id?:             number
  codigo_producto: string
  razon_social:    string
  ruc:             string
  direccion:       string
  establecimiento: string
  tipo:            string
  codigo_existencia: string
  unidad_medida:   string
  metodo_valuacion: string
}

const EMPTY: Omit<Empresa, 'id'> = {
  codigo_producto:   '',
  razon_social:      '',
  ruc:               '',
  direccion:         '',
  establecimiento:   'Almacén',
  tipo:              'Mercadería',
  codigo_existencia: '',
  unidad_medida:     '01',
  metodo_valuacion:  'Costo Promedio',
}

export type EmpresaConfigHandle = { abrirCrear: () => void }

const EmpresaConfig = forwardRef<EmpresaConfigHandle>((_props, ref) => {
  const [empresas,     setEmpresas]     = useState<Empresa[]>([])
  const [form,         setForm]         = useState({ ...EMPTY })
  const [editando,     setEditando]     = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [mensaje,      setMensaje]      = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  const fetchEmpresas = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/empresa/`)
      setEmpresas(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmpresas() }, [])

  const abrirCrear = () => {
    setForm({ ...EMPTY })
    setEditando(null)
    setMensaje(null)
    setModalAbierto(true)
  }

  useImperativeHandle(ref, () => ({ abrirCrear }))

  const abrirEditar = (e: Empresa) => {
    setForm({
      codigo_producto:   e.codigo_producto,
      razon_social:      e.razon_social,
      ruc:               e.ruc,
      direccion:         e.direccion ?? '',
      establecimiento:   e.establecimiento,
      tipo:              e.tipo,
      codigo_existencia: e.codigo_existencia ?? '',
      unidad_medida:     e.unidad_medida ?? '01',
      metodo_valuacion:  e.metodo_valuacion,
    })
    setEditando(e.codigo_producto)
    setMensaje(null)
    setModalAbierto(true)
  }

  const handleGuardar = async () => {
    if (!form.codigo_producto || !form.razon_social || !form.ruc) {
      setMensaje({ texto: 'Código, razón social y RUC son requeridos', tipo: 'error' })
      return
    }
    setSaving(true)
    setMensaje(null)
    try {
      const url    = editando ? `${API}/api/v1/empresa/${editando}` : `${API}/api/v1/empresa/`
      const method = editando ? 'PUT' : 'POST'
      const body   = editando
        ? { razon_social: form.razon_social, ruc: form.ruc, direccion: form.direccion, establecimiento: form.establecimiento, tipo: form.tipo, codigo_existencia: form.codigo_existencia, unidad_medida: form.unidad_medida, metodo_valuacion: form.metodo_valuacion }
        : form

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Error al guardar')

      setMensaje({ texto: editando ? 'Actualizado correctamente' : 'Empresa registrada', tipo: 'ok' })
      await fetchEmpresas()
      setTimeout(() => setModalAbierto(false), 900)
    } catch (e) {
      setMensaje({ texto: (e as Error).message, tipo: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async (codigo: string) => {
    if (!confirm(`¿Eliminar empresa del código ${codigo}?`)) return
    setDeleting(codigo)
    try {
      await fetch(`${API}/api/v1/empresa/${codigo}`, { method: 'DELETE' })
      await fetchEmpresas()
    } finally {
      setDeleting(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(13,21,37,0.9)',
    border: '1px solid rgba(56,139,221,0.18)', borderRadius: 7,
    padding: '8px 11px', fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace", color: '#c8ddef',
    outline: 'none', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
    textTransform: 'uppercase', color: '#1e3a5a',
    marginBottom: 5, fontFamily: "'IBM Plex Mono', monospace", display: 'block',
  }

  const th: React.CSSProperties = {
    padding: '8px 12px', fontSize: 9, fontWeight: 700,
    letterSpacing: '.12em', textTransform: 'uppercase',
    color: '#4a7a9a', background: '#0a1929',
    borderBottom: '1px solid rgba(56,139,221,0.14)',
    fontFamily: "'IBM Plex Mono', monospace", textAlign: 'left',
  }

  const td: React.CSSProperties = {
    padding: '10px 12px', fontSize: 12, color: '#6a8ab0',
    borderBottom: '1px solid rgba(55,138,221,0.05)',
    fontFamily: "'IBM Plex Mono', monospace",
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: '#0d1525', border: '1px solid rgba(56,139,221,0.1)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#1e3a5a', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>Cargando...</div>
        ) : empresas.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#1e3a5a', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>Sin empresas registradas — agrega una con el botón de arriba</div>
        ) : (
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
            <thead>
              <tr>
                <th style={th}>Código</th>
                <th style={th}>Razón Social</th>
                <th style={th}>RUC</th>
                <th style={th}>Dirección</th>
                <th style={{ ...th, textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(55,138,221,0.03)' }}>
                  <td style={{ ...td, color: '#60a5fa', fontWeight: 600 }}>{e.codigo_producto}</td>
                  <td style={td}>{e.razon_social}</td>
                  <td style={td}>{e.ruc}</td>
                  <td style={td}>{e.direccion || '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                      <button onClick={() => abrirEditar(e)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(56,139,221,0.12)', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => handleEliminar(e.codigo_producto)} disabled={deleting === e.codigo_producto} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {deleting === e.codigo_producto ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAbierto && (
        <div
          onClick={e => e.target === e.currentTarget && setModalAbierto(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(4,10,24,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}
        >
          <div style={{ width: 480, maxHeight: '90vh', overflowY: 'auto', background: '#0d1525', border: '1px solid rgba(56,139,221,0.18)', borderTop: '2px solid #f59e0b', borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
              {editando ? `Editar: ${editando}` : 'Nueva empresa'}
            </div>

            <div style={{ height: 1, background: 'rgba(56,139,221,0.1)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Código — solo al crear */}
              <div>
                <label style={labelStyle}>Código del Producto *</label>
                <input
                  style={{ ...inputStyle, opacity: editando ? 0.5 : 1 }}
                  value={form.codigo_producto}
                  onChange={e => setForm({ ...form, codigo_producto: e.target.value })}
                  disabled={!!editando}
                  placeholder="Ej: 021002"
                />
              </div>

              {/* Razón Social */}
              <div>
                <label style={labelStyle}>Razón Social *</label>
                <input style={inputStyle} value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} placeholder="Ej: AGROPECUARIA SARAVIA S.R.LTDA" />
              </div>

              {/* RUC */}
              <div>
                <label style={labelStyle}>R.U.C. *</label>
                <input style={inputStyle} value={form.ruc} onChange={e => setForm({ ...form, ruc: e.target.value })} placeholder="Ej: 20367775247" />
              </div>

              {/* Dirección */}
              <div>
                <label style={labelStyle}>Dirección</label>
                <input style={inputStyle} value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} placeholder="Ej: Av. Principal 123, Lima" />
              </div>
            </div>

            {mensaje && (
              <div style={{ padding: '8px 12px', borderRadius: 7, fontSize: 12, color: mensaje.tipo === 'ok' ? '#4ade80' : '#fca5a5', background: mensaje.tipo === 'ok' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${mensaje.tipo === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                {mensaje.tipo === 'ok' ? '✓' : '✕'} {mensaje.texto}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setModalAbierto(false)} style={{ padding: '7px 16px', borderRadius: 7, cursor: 'pointer', background: 'rgba(56,139,221,0.06)', border: '1px solid rgba(56,139,221,0.14)', color: '#2a5a8a', fontSize: 12, fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={saving}
                style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: saving ? 'rgba(245,158,11,0.3)' : 'linear-gradient(135deg,#d97706,#b45309)', color: '#e2e8f0', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
              >
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default EmpresaConfig