"use client"

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

// ── COMPONENTES DE DISEÑO ATÓMICOS DE LA PLANTILLA ──
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/Badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Componentes funcionales y hooks reales de tu negocio
import FileUploader from '@/components/FileUploader'
import ModalSaldoInicial from '@/components/ModalSaldoInicial'
import { useKardex } from '@/hooks/useKardex'

// Iconografía premium unificada
import { 
  Building2, 
  Plus, 
  TrendingUp, 
  Upload, 
  Loader2, 
  AlertCircle 
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Empresa {
  id:     number
  nombre: string
}

export default function Home() {
  const navigate = useNavigate()
  const { subirArchivos, uploading } = useKardex()

  // Estados reales de tu lógica de negocio
  const [archivosMovimientos, setArchivosMovimientos] = useState<File[]>([])
  const [archivoSaldos,       setArchivoSaldos]       = useState<File[]>([])
  const [modalSaldoOpen,      setModalSaldoOpen]       = useState(false)
  const [empresas,            setEmpresas]             = useState<Empresa[]>([])
  const [empresaId,           setEmpresaId]            = useState<number | null>(null)

  // Carga de empresas real de tu backend en FastAPI
  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const res = await fetch(`${API}/api/v1/empresa/`)
        if (res.ok) {
          const data: Empresa[] = await res.json()
          setEmpresas(data.filter(e => e.id !== 1))
        }
      } catch (e) {
        console.error('Error al cargar empresas', e)
      }
    }
    fetchEmpresas()
  }, [])

  // Procesamiento real conectado a tu Hook de subida fiscal
  const handleProcesar = async () => {
    if (archivosMovimientos.length === 0) return
    const toastId = toast.loading('Procesando Kardex…')
    try {
      const resultado = await subirArchivos(
        archivosMovimientos,
        archivoSaldos[0] ?? null,
        empresaId ?? undefined,
      )
      if (resultado) {
        toast.success(`Kardex procesado correctamente`, { id: toastId })
        localStorage.setItem("ultimo_procesamiento_id", String(resultado.procesamiento_id))
        navigate(`/kardex/${resultado.procesamiento_id}`)
      } else {
        toast.error('No se pudo procesar el Kardex', { id: toastId })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al procesar el Kardex', { id: toastId })
    }
  }

  const listo = archivosMovimientos.length > 0
  const empresaSeleccionada = empresas.find(e => e.id === empresaId)

  return (
    <>
      {/* Tu modal de saldos e indicaciones en segundo plano */}
      <ModalSaldoInicial
        open={modalSaldoOpen}
        empresaId={1}
        onClose={() => setModalSaldoOpen(false)}
        saldoEditar={null}
        onGuardado={() => toast.success("Saldo inicial guardado correctamente")}
      />

      {/* Si tu BaseLayout en App.tsx acepta propiedades de cabecera como title, 
        puedes eliminarlas de aquí abajo. Pero si prefieres asegurar el diseño interno, 
        este contenedor inyecta la grilla exacta de la plantilla:
      */}
      <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-5xl mx-auto animate-in fade-in-50 duration-200">
        
        {/* Encabezado Dinámico con el Selector Corporativo Oficial de Shadcn */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Procesar Kardex</h1>
            <p className="text-sm text-muted-foreground">
              Importa tus archivos Excel — los productos nuevos se asignan automáticamente.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 text-muted-foreground/80">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider hidden md:inline">
                Empresa
              </span>
            </div>

            <Select
              value={empresaId ? String(empresaId) : "default"}
              onValueChange={(val) => setEmpresaId(val === "default" ? null : Number(val))}
            >
              <SelectTrigger className="w-[220px] font-mono text-xs cursor-pointer shadow-xs border-border/60 bg-card hover:bg-muted/40 transition-colors h-9">
                <SelectValue placeholder="⚠️ Sin asignar (default)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default" className="font-mono text-xs text-amber-500 font-medium">
                  ⚠️ Sin asignar (default)
                </SelectItem>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)} className="font-mono text-xs">
                    🏢 {emp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {empresaId && empresaSeleccionada && (
              <Badge
                variant="secondary"
                className="font-mono text-[11px] px-2.5 py-1 gap-1.5 bg-foreground/[0.04] text-foreground border-border/40 h-9"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {empresaSeleccionada.nombre}
              </Badge>
            )}
          </div>
        </div>

        {/* Zona de Carga de Archivos Avanzada (Grid con Bordes Superiores Primary) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Tarjeta: Saldos Iniciales (Opcional) */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-xs shadow-xs transition-all relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-primary/80 hover:shadow-md hover:border-foreground/10 duration-200">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                >
                  Opcional
                </Badge>
                <CardTitle className="text-base font-semibold mt-2.5 text-foreground/90">
                  Saldos iniciales
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/80">
                  Stock base al inicio del período
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalSaldoOpen(true)}
                className="h-8 text-xs font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition-colors"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Manual
              </Button>
            </CardHeader>
            <CardContent>
              {/* Tu cargador de archivos real inyectado dentro del contenedor de la plantilla */}
              <FileUploader 
                label="" 
                multiple={false} 
                files={archivoSaldos} 
                onChange={setArchivoSaldos} 
                disabled={uploading} 
                description="Un archivo .xlsx con los saldos base" 
              />
            </CardContent>
          </Card>

          {/* Tarjeta: Movimientos (Requerido) */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-xs shadow-xs transition-all relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-primary/80 hover:shadow-md hover:border-foreground/10 duration-200">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                >
                  Requerido
                </Badge>
                <CardTitle className="text-base font-semibold mt-2.5 text-foreground/90">
                  Movimientos
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground/80">
                  Ventas, compras y devoluciones
                </CardDescription>
              </div>
              <div className="p-2 bg-foreground/[0.04] text-foreground/70 rounded-lg border border-border/40">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Tu cargador múltiple real */}
              <FileUploader 
                label="" 
                multiple={true} 
                files={archivosMovimientos} 
                onChange={setArchivosMovimientos} 
                disabled={uploading} 
                description="Uno o más archivos .xlsx de movimientos" 
              />
            </CardContent>
          </Card>
        </div>

        {/* Barra de Procesamiento Final (Acción Real) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t pt-5 border-dashed border-border/60 mt-2">
          <Button
            size="lg"
            onClick={handleProcesar}
            disabled={!listo || uploading}
            className="font-semibold gap-2 shadow-xs cursor-pointer w-full sm:w-auto h-10 px-5"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Procesar Kardex
              </>
            )}
          </Button>

          {/* Validaciones en cascada estilizadas con la tipografía de la plantilla */}
          {!listo && !uploading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              Agrega al menos un archivo de movimientos en la tarjeta requerida para activar el botón.
            </p>
          )}

          {listo && !uploading && empresaId && (
            <p className="text-xs font-mono text-foreground/90 font-semibold bg-foreground/[0.03] border border-border/40 px-3 py-1.5 rounded-lg animate-in fade-in duration-200">
              &rarr; Los productos nuevos se asignarán a:{" "}
              <span className="underline font-bold text-primary">
                {empresaSeleccionada?.nombre}
              </span>
            </p>
          )}
        </div>

      </div>
    </>
  )
}