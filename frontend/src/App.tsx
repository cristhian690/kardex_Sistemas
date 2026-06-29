import { Routes, Route, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/context/AuthContex'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarConfigProvider } from '@/context/sidebar-context' // 👈 ¡Importamos el proveedor real!
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { BaseLayout } from '@/components/layouts/base-layout'

// Tus páginas
import Login from '@/pages/login/index'
import Home from '@/pages/Home'
import Dashboard from '@/pages/Dashboard'
import Kardex from '@/pages/movimientos/index'
import Historial from '@/pages/historial/index'
import SaldosIniciales from '@/pages/saldos-iniciales/index'
import Empresas from '@/pages/empresas/index' 
import Productos from '@/pages/productos/index'
import GuiaInconsistencias from '@/pages/guia-inconsistencias/index'
import ManualUsuario from '@/pages/manual/index'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="kardex-ui-theme">
      <Toaster position="top-right" />

      <Routes>
        {/* Ruta Pública (Fuera de la barra lateral) */}
        <Route path="/login" element={<Login />} />

        {/* ── Rutas del Dashboard Enueltas en la Configuración del Sidebar ── */}
        <Route
          element={
            <ProtectedRoute>
              {/* El ConfigProvider le inyecta al BaseLayout los estados de la plantilla */}
              <SidebarConfigProvider>
                <BaseLayout>
                  <Outlet />
                </BaseLayout>
              </SidebarConfigProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/"                          element={<Home />} />
          <Route path="/dashboard"                  element={<Dashboard/>} /> 
          <Route path="/kardex/:procesamiento_id" element={<Kardex />} />
          <Route path="/historial/"                element={<Historial />} />
          <Route path="/saldos"                   element={<SaldosIniciales />} />
          <Route path="/empresas"                 element={<Empresas />} />
          <Route path="/productos"                element={<Productos />} />
          <Route path="/guia-inconsistencias"     element={<GuiaInconsistencias />} />
          <Route path="/manual"                   element={<ManualUsuario />} />
        </Route>
      </Routes>
      </ThemeProvider>
    </AuthProvider>
  )
}