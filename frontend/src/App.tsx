import { Routes, Route } from 'react-router-dom'
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
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Protegidas */}
        <Route path="/"                         element={<ProtectedRoute><Home />            </ProtectedRoute>} />
        <Route path="/kardex/:procesamiento_id" element={<ProtectedRoute><Kardex />          </ProtectedRoute>} />
        <Route path="/historial"                element={<ProtectedRoute><Historial />       </ProtectedRoute>} />
        <Route path="/saldos"                   element={<ProtectedRoute><SaldosIniciales />  </ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}

export default App