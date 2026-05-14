import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Home from './pages/Home'
import Kardex from './pages/Kardex'
import Historial from './pages/Historial'
import SaldosIniciales from './pages/SaldosIniciales'

function App() {
  return (
    <AuthProvider>
      {/* Toaster global — aparece en todas las páginas */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0d1525',
            color: '#e2e8f0',
            border: '1px solid rgba(56,139,221,0.2)',
            borderRadius: '8px',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#0d1525' },
            style: { border: '1px solid rgba(34,197,94,0.3)' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#0d1525' },
            style: { border: '1px solid rgba(239,68,68,0.3)' },
            duration: 6000,
          },
        }}
      />

      <Routes>
        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Protegidas */}
        <Route path="/"                         element={<ProtectedRoute><Home />            </ProtectedRoute>} />
        <Route path="/kardex/:procesamiento_id" element={<ProtectedRoute><Kardex />          </ProtectedRoute>} />
        <Route path="/historial"                element={<ProtectedRoute><Historial />       </ProtectedRoute>} />
        <Route path="/saldos"                   element={<ProtectedRoute><SaldosIniciales /> </ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}

export default App