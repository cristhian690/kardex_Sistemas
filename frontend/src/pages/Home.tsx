"use client"

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

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

import FileUploader from '@/components/FileUploader'
import ModalSaldoInicial from '@/components/ModalSaldoInicial'
import { useKardex } from '@/hooks/useKardex'
import { GuidedTourInit } from '@/components/GuidedTour'
import { InfoTooltip } from '@/components/ui/info-tooltip'

import { 
  Building2, 
  Plus, 
  TrendingUp, 
  Upload, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Empresa {
  id:     number
  nombre: string
}

export default function Home() {
  const navigate = useNavigate()
  const { subirArchivos, uploading } = useKardex()

  const [archivosMovimientos, setArchivosMovimientos] = useState<File[]>([])
  const [archivoSaldos,       setArchivoSaldos]       = useState<File[]>([])
  const [modalSaldoOpen,      setModalSaldoOpen]       = useState(false)
  const [empresas,            setEmpresas]             = useState<Empresa[]>([])
  const [empresaId,           setEmpresaId]            = useState<number | null>(null)
  
  const [isLoadingEmpresas,   setIsLoadingEmpresas]    = useState(true)
  const [errorEmpresas,       setErrorEmpresas]        = useState<string | null>(null)

  useEffect(() => {
    const fetchEmpresas = async () => {
      setIsLoadingEmpresas(true)
      setErrorEmpresas(null)
      try {
        const res = await fetch(`${API}/api/v1/empresa/`)
        if (res.ok) {
          const data: Empresa[] = await res.json()
          setEmpresas(data.filter(e => e.id !== 1))
        } else {
          setErrorEmpresas('No se pudieron cargar las empresas.')
        }
      } catch (e) {
        console.error('Error al cargar empresas', e)
        setErrorEmpresas('Error de conexión al cargar empresas.')
      } finally {
        setIsLoadingEmpresas(false)
      }
    }
    fetchEmpresas()
  }, [])

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
        toast.success('Procesamiento exitoso', { 
          id: toastId,
          description: "Los archivos se han procesado correctamente."
        })
        localStorage.setItem("ultimo_procesamiento_id", String(resultado.procesamiento_id))
        navigate(`/kardex/${resultado.procesamiento_id}`)
      } else {
        toast.error('Fallo en el procesamiento', { 
          id: toastId,
          description: "No se pudo procesar el Kardex."
        })
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'El archivo contiene un formato inválido o datos inconsistentes.'
      toast.error('Error de Procesamiento', { 
        id: toastId,
        description: errorMessage
      })
    }
  }

  const listo = archivosMovimientos.length > 0
  const empresaSeleccionada = empresas.find(e => e.id === empresaId)

  // Estados visuales derivados
  const saldosListo = archivoSaldos.length > 0
  const listoParaProcesar = listo && empresaId

  return (
    <>
      <ModalSaldoInicial
        open={modalSaldoOpen}
        empresaId={1}
        onClose={() => setModalSaldoOpen(false)}
        saldoEditar={null}
        onGuardado={() => toast.success("Guardado exitoso", { description: "El saldo inicial se ha guardado correctamente." })}
      />

      <GuidedTourInit />

      <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-5xl mx-auto">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Procesar Kardex</h1>
            <p className="text-sm text-muted-foreground">
              Importa tus archivos Excel — los productos nuevos se registrarán automáticamente.
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
              disabled={isLoadingEmpresas || !!errorEmpresas}
            >
              <SelectTrigger id="tour-empresa" className="w-[220px] font-mono text-xs cursor-pointer shadow-xs border-border/60 bg-card hover:bg-muted/40 transition-colors h-9">
                <SelectValue placeholder={
                  isLoadingEmpresas ? "Cargando empresas..." : 
                  errorEmpresas ? "Error al cargar" : 
                  "Seleccionar empresa..."
                } />
              </SelectTrigger>
              <SelectContent>
                {!isLoadingEmpresas && !errorEmpresas && (
                  <>
                    <SelectItem value="default" className="font-mono text-xs text-amber-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Sin asignar (default)
                      </div>
                    </SelectItem>
                    {empresas.map((emp) => (
                      <SelectItem key={emp.id} value={String(emp.id)} className="font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 opacity-70" />
                          {emp.nombre}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
                {errorEmpresas && (
                  <SelectItem value="error" disabled className="text-red-500">
                    {errorEmpresas}
                  </SelectItem>
                )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            id="tour-saldo-inicial" 
            className={`border-border/40 bg-card/40 backdrop-blur-md shadow-xs transition-all duration-300 relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:transition-colors hover:shadow-lg hover:border-foreground/20 ${saldosListo ? 'before:bg-green-500 border-green-500/20' : 'before:bg-primary/80'}`}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                >
                  Opcional
                </Badge>
                <CardTitle className="text-base font-semibold mt-2.5 text-foreground/90 flex items-center gap-1.5">
                  Saldos iniciales
                  {saldosListo && <CheckCircle2 className="h-4 w-4 text-green-500 ml-1 animate-in zoom-in duration-300" />}
                  <InfoTooltip content="El saldo inicial es el stock base con el que empiezas. Si ya operabas antes, es importante cargarlo para que los costos se calculen correctamente." />
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

          <Card 
            id="tour-upload-movimientos" 
            className={`border-border/40 bg-card/40 backdrop-blur-md shadow-xs transition-all duration-300 relative overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:transition-colors hover:shadow-lg hover:border-foreground/20 ${listo ? 'before:bg-green-500 border-green-500/20' : 'before:bg-primary/80'}`}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  >
                    Requerido
                  </Badge>
                  {listo && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-[10px] animate-in zoom-in duration-300">
                      {archivosMovimientos.length} archivo{archivosMovimientos.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-semibold mt-2.5 text-foreground/90 flex items-center gap-1.5">
                  Movimientos
                  {listo && <CheckCircle2 className="h-4 w-4 text-green-500 ml-1 animate-in zoom-in duration-300" />}
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t pt-5 border-dashed border-border/60 mt-2">
          <Button
            id="tour-procesar"
            size="lg"
            onClick={handleProcesar}
            disabled={!listo || uploading}
            className={`font-semibold gap-2 shadow-xs cursor-pointer w-full sm:w-auto h-10 px-5 transition-all duration-300 ${listoParaProcesar && !uploading ? 'shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)]' : ''}`}
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

          <div className="hidden sm:flex self-center ml-2">
             <InfoTooltip content="Al procesar, el sistema leerá los Excel cargados, ordenará los movimientos cronológicamente y calculará el costo promedio ponderado de tu inventario." />
          </div>

          {!listo && !uploading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium animate-in fade-in slide-in-from-left-2 duration-300">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 animate-pulse" />
              Agrega al menos un archivo de movimientos en la tarjeta requerida para activar el botón.
            </p>
          )}

          {listo && !uploading && empresaId && (
            <p className="text-xs font-mono text-foreground/90 font-semibold bg-foreground/[0.03] border border-border/40 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-left-2 duration-300">
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