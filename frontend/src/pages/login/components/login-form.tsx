"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react"
import toast from "react-hot-toast"
import { useAuth } from "@/context/AuthContex"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/logo"

interface LoginFormProps extends React.ComponentProps<"div"> {
  onShakeTrigger?: () => void
}

export function LoginForm({ className, onShakeTrigger, ...props }: LoginFormProps) {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return

    setLoading(true)
    try {
      await login({ username, password })
      toast.success(`Bienvenido al sistema, ${username}`)
      navigate("/", { replace: true })
    } catch (err: any) {
      toast.error(err.message || "Credenciales incorrectas")
      if (onShakeTrigger) onShakeTrigger()
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-border/40 bg-card/60 backdrop-blur-xl shadow-2xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          
          {/* Columna Izquierda: Formulario Real */}
          <form onSubmit={handleSubmit} noValidate className="p-6 md:p-8 flex flex-col justify-center text-left">
            <div className="flex flex-col gap-6">
              
              {/* Identidad de la Empresa */}
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl border border-primary/20 shadow-xs">
                  <Logo size={20} className="text-current" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold font-mono tracking-wide leading-none text-foreground">KARDEX</span>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">Sistema CPP</span>
                </div>
                <BadgeInfo>v2.0</BadgeInfo>
              </div>

              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold font-mono tracking-tight text-foreground">Iniciar sesión</h1>
                <p className="text-xs text-muted-foreground">
                  Introduce tus credenciales para acceder al panel de control.
                </p>
              </div>

              {/* Input: Usuario */}
              <div className="grid gap-2">
                <Label htmlFor="login-user" className="text-xs font-mono text-muted-foreground/90">Usuario</Label>
                <Input
                  id="login-user"
                  type="text"
                  placeholder="Tu nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                  required
                  className="h-10 text-xs bg-muted/20"
                />
              </div>

              {/* Input: Contraseña */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-pass" className="text-xs font-mono text-muted-foreground/90">Contraseña</Label>
                  <a href="#" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors underline-offset-4 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="login-pass"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    required
                    className="h-10 text-xs bg-muted/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 p-1 rounded-md text-muted-foreground/60 hover:text-foreground transition-colors outline-none"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Botón Principal de Envío */}
              <Button 
                type="submit" 
                disabled={!canSubmit} 
                className="w-full h-10 font-bold font-mono text-xs rounded-xl cursor-pointer gap-2 transition-transform active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Ingresar Panel
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Columna Derecha: Imagen de Marca con Filtro Estilizado */}
          <div className="bg-muted relative hidden md:block border-l border-border/30">
            <img
              src="https://scontent.flim4-3.fna.fbcdn.net/v/t39.30808-6/449044196_323205804174994_1975367383698928735_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2048&ctp=s2048x2048&_nc_cat=102&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeF4DVbHbL6xGNs3BGg4cybFGoVPijwOyjYahU-KPA7KNjWsoT-4qL7VciUOEgnG6tNqkh9YVqGeTOTRr1-EgS4t&_nc_ohc=vDYdDzth3K0Q7kNvwE0aeSh&_nc_oc=Adq83mxCwEaqW5fSoIYmR83lYun8fLu7mgGlrLv0UQyDv-WfacUJLo2LNZVAfWarEYk&_nc_zt=23&_nc_ht=scontent.flim4-3.fna&_nc_gid=ljnv4k2lIGGdCjMuCYiITg&_nc_ss=7b2a8&oh=00_Af8twXPL4PnNAmyJse4HDKZwblhAX_nmIPmewWfCJVqO9Q&oe=6A394C60"
              alt="Kardex Background"
              className="absolute inset-0 h-full w-full object-cover brightness-[0.4] dark:brightness-[0.35]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 text-left space-y-1 z-10">
              <p className="text-xs font-mono font-bold text-primary tracking-wider uppercase">Costo Promedio Ponderado</p>
              <h2 className="text-lg font-bold text-white tracking-tight leading-snug">Auditoría contable y control de existencias en tiempo real.</h2>
            </div>
          </div>

        </CardContent>
      </Card>
      
      <div className="text-muted-foreground text-center text-[11px] font-mono tracking-tight opacity-50">
        Sistema de Control de Inventarios · CPP © {new Date().getFullYear()}
      </div>
    </div>
  )
}

function BadgeInfo({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-auto bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold font-mono text-primary">
      {children}
    </span>
  )
}