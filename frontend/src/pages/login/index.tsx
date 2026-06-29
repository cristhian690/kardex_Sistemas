import { useState, useEffect } from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "./components/login-form"
import { cn } from "@/lib/utils"

const CAROUSEL_ITEMS = [
  {
    title: "Auditoría contable y control de existencias en tiempo real.",
    desc: "Administra tus movimientos y saldos con precisión milimétrica.",
    filter: "hue-rotate-0",
  },
  {
    title: "Manejo Multi-Empresa Avanzado.",
    desc: "Gestiona múltiples sucursales y entidades desde un solo panel integrado.",
    filter: "hue-rotate-[30deg]",
  },
  {
    title: "Generación de Reportes CPP Detallados.",
    desc: "Exporta tus valorizaciones y cumple con los estándares más estrictos.",
    filter: "hue-rotate-[60deg]",
  }
]

export default function LoginPage() {
  const [activeIndex, setActiveIndex] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CAROUSEL_ITEMS.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background relative">
      
      {/* Columna Izquierda (Formulario) con patrón sutil de fondo */}
      <div className="relative flex flex-col gap-4 p-6 md:p-10 overflow-hidden bg-background">
        
        {/* Patrón de puntos SVG sutil en el fondo */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at center, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-10 flex flex-col justify-center items-center h-full w-full">
          {/* Marca / Logo */}
          <a href="#" className="flex items-center justify-center lg:justify-start gap-3 font-medium mb-10 w-full max-w-sm animate-in fade-in slide-in-from-top-4 duration-700 fill-mode-both">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <GalleryVerticalEnd className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight leading-none">KARDEX</span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">Sistema CPP</span>
            </div>
          </a>
          
          {/* Formulario */}
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Columna Derecha (Imagen Carrusel) */}
      <div className="relative hidden bg-muted lg:block overflow-hidden shadow-2xl z-10">
        {CAROUSEL_ITEMS.map((item, index) => (
          <div 
            key={index}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1500ms] ease-in-out",
              index === activeIndex ? "opacity-100" : "opacity-0"
            )}
          >
            <img
              src="/img.png"
              alt="Fondo Kardex"
              className={cn(
                "absolute inset-0 h-full w-full object-cover dark:brightness-[0.4] dark:grayscale-[0.2]",
                item.filter
              )}
            />
            {/* Gradiente sobre la imagen para que el texto resalte */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent pointer-events-none" />
            
            {/* Texto sobre la imagen */}
            <div className="absolute bottom-16 left-12 right-12 text-left space-y-3 z-10">
              <h2 className="text-3xl font-bold text-white tracking-tight leading-tight drop-shadow-md transition-transform duration-700 translate-y-0"
                  style={{ transform: index === activeIndex ? 'translateY(0)' : 'translateY(15px)' }}>
                {item.title}
              </h2>
              <p className="text-white/80 font-medium text-lg drop-shadow transition-transform duration-700 delay-100"
                 style={{ transform: index === activeIndex ? 'translateY(0)' : 'translateY(15px)' }}>
                {item.desc}
              </p>
            </div>
          </div>
        ))}

        {/* Indicadores del carrusel */}
        <div className="absolute bottom-8 left-12 flex gap-2 z-20">
          {CAROUSEL_ITEMS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500 cursor-pointer shadow-sm",
                i === activeIndex ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/70"
              )}
              aria-label={`Ir a diapositiva ${i + 1}`}
            />
          ))}
        </div>
      </div>
      
    </div>
  )
}