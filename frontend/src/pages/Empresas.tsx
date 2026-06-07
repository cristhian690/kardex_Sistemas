import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import EmpresaConfig, { type EmpresaConfigHandle } from '../components/EmpresaConfig'
import ModalSaldoInicial from '../components/ModalSaldoInicial'

const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function Empresas() {
  const [modalSaldoOpen, setModalSaldoOpen] = useState(false)
  const empresaRef = useRef<EmpresaConfigHandle>(null)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#07101e', fontFamily: "'Inter', sans-serif", color: '#c8ddef' }}>
      <Sidebar onAgregarSaldo={() => setModalSaldoOpen(true)} />

      {/* ✅ CORREGIDO: saldoEditar={null} y onGuardado cierra el modal */}
      <ModalSaldoInicial
        open={modalSaldoOpen}
        onClose={() => setModalSaldoOpen(false)}
        saldoEditar={null}
        onGuardado={() => {
          setModalSaldoOpen(false)
          toast.success('Saldo inicial guardado correctamente')
        }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
              Empresas
            </h1>
            <p style={{ fontSize: 11, color: '#1e3a5a', marginTop: 2 }}>
              Configura los datos de empresa por código de producto
            </p>
          </div>

          <button
            type="button"
            onClick={() => empresaRef.current?.abrirCrear()}
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
            <IconPlus /> Nueva empresa
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <EmpresaConfig ref={empresaRef} />
        </div>
      </div>
    </div>
  )
}