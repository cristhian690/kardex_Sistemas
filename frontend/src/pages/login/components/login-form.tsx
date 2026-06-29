import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react"
import toast from "react-hot-toast"
import { useAuth } from "@/context/AuthContex"
import { cn } from "@/lib/utils"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const loginSchema = z.object({
  username: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  password: z.string().min(4, "La contraseña debe tener al menos 4 caracteres"),
  remember: z.boolean().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { login } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: false,
    },
  })

  // Escuchar globalmente eventos de teclado para CapsLock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setCapsLockActive(e.getModifierState("CapsLock"))
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyDown)
    }
  }, [])

  // Cargar usuario recordado si existe
  useEffect(() => {
    const rememberedUser = localStorage.getItem("kardex-remember-user")
    if (rememberedUser) {
      form.setValue("username", rememberedUser)
      form.setValue("remember", true)
    }
  }, [form])

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true)
    try {
      await login({ username: values.username, password: values.password })
      if (values.remember) {
        localStorage.setItem("kardex-remember-user", values.username)
      } else {
        localStorage.removeItem("kardex-remember-user")
      }
      toast.success(`Bienvenido al sistema, ${values.username}`)
      navigate("/", { replace: true })
    } catch (err: any) {
      toast.error(err.message || "Credenciales incorrectas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full", className)} {...props}>
      <div className="flex flex-col gap-2 text-center md:text-left mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
        <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem className="grid gap-2 text-left space-y-0">
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tu nombre de usuario"
                      autoFocus
                      autoComplete="username"
                      disabled={loading}
                      className="h-11"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px] font-medium text-destructive" />
                </FormItem>
              )}
            />
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[400ms] fill-mode-both">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="grid gap-2 text-left space-y-0">
                  <div className="flex items-center">
                    <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contraseña</FormLabel>
                    <a
                      href="#"
                      className="ml-auto text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                    >
                      ¿Olvidaste tu clave?
                    </a>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={loading}
                        className={cn("h-11 pr-10", capsLockActive && "border-amber-500/50 focus-visible:ring-amber-500/30")}
                        {...field}
                      />
                      
                      <div className="absolute right-0 top-0 h-full flex items-center pr-3 gap-1.5">
                        {capsLockActive && (
                          <div className="text-amber-500 bg-background px-1" title="Bloqueo de mayúsculas activado">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-muted-foreground hover:text-foreground focus:outline-none focus:text-foreground transition-colors"
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </FormControl>
                  {capsLockActive && (
                    <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">
                      Bloq Mayús activado
                    </p>
                  )}
                  <FormMessage className="text-[11px] font-medium text-destructive" />
                </FormItem>
              )}
            />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[500ms] fill-mode-both">
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-1">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading}
                      className="rounded-[4px] data-[state=checked]:bg-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-[13px] font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      Recordarme en este equipo
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-[600ms] fill-mode-both">
            <Button type="submit" className="w-full h-11 text-sm font-semibold mt-1 transition-all active:scale-[0.98]" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar al Panel
            </Button>
          </div>
        </form>
      </Form>
      
      <div className="animate-in fade-in duration-1000 delay-[800ms] fill-mode-both text-balance text-center text-[11px] text-muted-foreground/70 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary mt-2">
        Al hacer clic en Entrar, aceptas nuestros <a href="#">Términos de servicio</a> y <a href="#">Política de privacidad</a>.
      </div>
    </div>
  )
}