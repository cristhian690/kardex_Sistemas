import { Routes, Route, Outlet } from 'react-router-dom'
import { Toaster as SonnerToaster } from 'sonner'
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { AuthProvider } from '@/context/AuthContex'
import { ThemeProvider } from '@/components/theme-provider'
import { useTheme } from '@/hooks/use-theme'
import { ConfirmProvider } from '@/context/confirm-context'
import { SidebarConfigProvider } from '@/context/sidebar-context' 
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

function AppToaster() {
  const { theme } = useTheme()
  return (
    <SonnerToaster
      position="top-right"
      theme={theme}
      closeButton
      toastOptions={{
        className: "bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl",
        classNames: {
          toast: "bg-background/60 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl p-4 gap-3",
          title: "text-foreground font-semibold text-sm",
          description: "text-muted-foreground text-xs",
          actionButton: "bg-primary text-primary-foreground font-semibold rounded-lg",
          cancelButton: "bg-muted text-muted-foreground font-semibold rounded-lg",
          icon: "mt-0.5",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
        warning: <AlertCircle className="h-5 w-5 text-amber-500" />,
        error: <AlertCircle className="h-5 w-5 text-destructive" />,
        loading: <Loader2 className="h-5 w-5 text-primary animate-spin" />,
      }}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="kardex-ui-theme">
      <AppToaster />

      <ConfirmProvider>
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
      </ConfirmProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}