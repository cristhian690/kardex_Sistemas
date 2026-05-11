import { useState } from 'react'
import type { FormEvent, CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login({ username, password })
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={logoBoxStyle}>K</div>
          <div>
            <div style={{ color: '#e8f0fc', fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>
              KARDEX
            </div>
            <div style={{ color: '#6b89b8', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Sistema CPP
            </div>
          </div>
        </div>

        <h1 style={{ color: '#e8f0fc', fontSize: 20, fontWeight: 600, margin: '0 0 6px' }}>
          Iniciar sesión
        </h1>
        <p style={{ color: '#6b89b8', fontSize: 13, margin: '0 0 24px' }}>
          Ingresa tus credenciales para continuar
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            disabled={loading}
            style={inputStyle}
          />

          <label style={labelStyle}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            style={inputStyle}
          />

          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              background: loading ? '#2d5a8a' : '#388bdd',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Ingresando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────
const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: '#0f1729',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const cardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 380,
  background: '#1a2340',
  border: '1px solid rgba(56,139,221,0.15)',
  borderRadius: 12,
  padding: 32,
}

const logoBoxStyle: CSSProperties = {
  width: 38,
  height: 38,
  background: '#1e3a5a',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#5b9bd5',
  fontWeight: 700,
  fontSize: 18,
}

const labelStyle: CSSProperties = {
  display: 'block',
  color: '#a8bdd9',
  fontSize: 12,
  marginBottom: 6,
  fontWeight: 500,
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#0f1729',
  border: '1px solid rgba(56,139,221,0.25)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#e8f0fc',
  fontSize: 14,
  marginBottom: 16,
  outline: 'none',
  boxSizing: 'border-box',
}

const errorStyle: CSSProperties = {
  background: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  color: '#fca5a5',
  padding: '10px 12px',
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 16,
}

const buttonStyle: CSSProperties = {
  width: '100%',
  padding: '11px',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  transition: 'background 0.15s',
}