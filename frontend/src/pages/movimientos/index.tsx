"use client"

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, FileSpreadsheet, Search, RefreshCw, Printer, FileDown, Filter, CalendarIcon, Check, SlidersHorizontal, Package, ListOrdered, AlertTriangle, TrendingDown, FileWarning, Lightbulb, CheckCircle2, XCircle, Info, ShieldCheck, Download } from 'lucide-react'
import { format, parseISO, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { useKardex } from '@/hooks/useKardex'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/Badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import KardexTable, { type KardexTableHandle } from './components/kardex-table'

import { cn } from "@/lib/utils"
import AlertaBanner from '@/components/AlertaBanner'
import BadgeProducto from '@/components/BadgeProducto'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { FiltroFecha as IFiltroFecha } from '@/types'

interface MetricCardProps {
  label: string; value: string; sub: string; colorClass: string; strokeColor: string
}
const MetricCard = ({ label, value, sub, colorClass }: MetricCardProps) => (
  <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-lg px-3 py-2 flex items-center justify-between min-w-0 shadow-sm transition-colors hover:bg-card/60">
    <div className="flex items-center gap-1.5 truncate pr-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 truncate">{label}</span>
    </div>
    <div className="flex items-center gap-1.5 shrink-0">
      <span className={`text-[13px] font-bold tracking-tight ${colorClass}`}>{value}</span>
      <span className="text-[10px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-md font-medium">{sub}</span>
    </div>
  </div>
)

const _nf2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmt  = (n: number) => _nf2.format(Math.round(n * 100) / 100)
const fmtS = (n: number) => `S/. ${_nf2.format(Math.round(n * 100) / 100)}`

export default function Kardex() {
  const { procesamiento_id } = useParams<{ procesamiento_id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (procesamiento_id === 'ultimo') {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
      fetch(`${API_URL}/api/v1/historial/`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            navigate(`/kardex/${data[0].id}`, { replace: true })
          } else {
            navigate('/historial', { replace: true })
          }
        })
        .catch(() => navigate('/historial', { replace: true }))
    }
  }, [procesamiento_id, navigate])

  const {
    movimientos, metricas, alertas,
    loading, error, exporting,
    totalRegistros, erroresIntegridad,
    cargarKardex, descargarExcel,
  } = useKardex()

  const kardexTableRef = useRef<KardexTableHandle>(null)

  const [codigo, setCodigo] = useState('')
  const [filtroFecha, setFiltroFecha] = useState<IFiltroFecha>({ modo: 'anio_mes' })
  const [empresaImpresion, setEmpresaImpresion] = useState<{
    razon_social: string; ruc: string; establecimiento: string; tipo: string; metodo_valuacion: string
  } | null>(null)
  
  const [mostrarSemaforo, setMostrarSemaforo] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [draftCodigo, setDraftCodigo] = useState('')
  const [draftFiltroFecha, setDraftFiltroFecha] = useState<IFiltroFecha>({ modo: 'anio_mes' })

  // ESTADOS PARA CONTROLAR LA REVALIDACIÓN DE TOLERANCIA
  const [toleranciaModo, setToleranciaModo] = useState("0.10")
  const [toleranciaPersonalizada, setToleranciaPersonalizada] = useState("")
  const [revalidando, setRevalidando] = useState(false)
  const [preImpresion, setPreImpresion] = useState(false)

  const [toastPending, setToastPending] = useState<string | null>(null)

  const id = Number(procesamiento_id)

  useEffect(() => { setDraftFiltroFecha(filtroFecha) }, [filtroFecha])

  // EFFECT PARA TOAST DINÁMICO TRAS REVALIDAR
  useEffect(() => {
    if (toastPending && !loading) {
      const anomalias = movimientos.filter(m => m.error_a || m.error_b || m.saldo_negativo).length
      const conformes = movimientos.length - anomalias
      toast.success(`Tolerancia actualizada a ${toastPending}.`, {
        description: `Se encontraron ${anomalias} anomalías y ${conformes} registros conformes.`,
        duration: 6000
      })
      setToastPending(null)
    }
  }, [movimientos, loading, toastPending])

  const aplicarFiltros = () => {
    setCodigo(draftCodigo)
    setFiltroFecha(draftFiltroFecha)
    cargarKardex(id, { ...draftFiltroFecha, codigo: draftCodigo || undefined })
  }

  const limpiarFiltros = () => {
    const clean: IFiltroFecha = { modo: 'anio_mes' }
    setCodigo(''); setDraftCodigo('')
    setFiltroFecha(clean); setDraftFiltroFecha(clean)
    setToleranciaModo("0.10")
    setToleranciaPersonalizada("")
    cargarKardex(id)
  }

  // FUNCIÓN ASÍNCRONA PARA DISPARAR LA REVALIDACIÓN EN CALIENTE
  const handleRevalidarTolerancia = async () => {
    const tolFinal = toleranciaModo === "custom" ? (toleranciaPersonalizada || "0.10") : toleranciaModo
    setRevalidando(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
      const res = await fetch(`${API_URL}/api/v1/kardex/${id}/revalidar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tolerancia: tolFinal })
      })
      if (res.ok) {
        // Refrescamos los datos en memoria volviendo a cargar las líneas actualizadas
        await cargarKardex(id, { ...filtroFecha, codigo: codigo || undefined })
        setToastPending(tolFinal)
      }
    } catch (err) {
      console.error("Error al revalidar margen:", err)
    } finally {
      setRevalidando(false)
    }
  }

  useEffect(() => {
    if (!id) return
    cargarKardex(id)
  }, [id])

  useEffect(() => {
    if (movimientos.length === 0) { setEmpresaImpresion(null); return; }
    const movConEmpresa = movimientos.find(m => m.producto?.empresa && m.producto.empresa.id !== 1) || movimientos[0]
    const emp = movConEmpresa?.producto?.empresa

    if (emp && emp.id !== 1) {
      setEmpresaImpresion({
        razon_social: emp.nombre, ruc: emp.ruc, establecimiento: emp.direccion || '', tipo: 'Mercadería', metodo_valuacion: 'Prom. Ponderado',
      })
    } else {
      setEmpresaImpresion({
        razon_social: '', ruc: '', establecimiento: '', tipo: 'Mercadería', metodo_valuacion: 'Prom. Ponderado',
      })
    }
  }, [movimientos, codigo])

  const handleExportar = () =>
    descargarExcel(codigo || undefined, filtroFecha.anio, filtroFecha.mes, filtroFecha.fecha_desde, filtroFecha.fecha_hasta)

  const handleImprimir = () => {
    toast.info("Consejo de impresión", {
      description: "Generando reporte de impresión. Asegúrate de configurar la orientación en 'Horizontal'.",
      duration: 6000,
      action: { label: 'Ver Manual', onClick: () => window.open('/manual.pdf', '_blank') }
    });
    setPreImpresion(true);
    setTimeout(() => {
      window.print()
      setPreImpresion(false);
    }, 1500)
  }

  const codigosVisiblesSet = useMemo(() => new Set(movimientos.map(m => m.codigo).filter(Boolean)), [movimientos])
  const codigosVisibles = Array.from(codigosVisiblesSet) as string[]
  const productosVisibles = codigosVisiblesSet.size
  const movimientosFiltrados = movimientos.length
  
  const codigosConNegativo = useMemo(() => {
    return new Set(movimientos.filter(m => m.saldo_negativo).map(m => m.codigo)).size
  }, [movimientos])

  const codigosConSaldoInicial = useMemo(() => {
    return new Set(movimientos.filter(m => m.es_saldo_inicial).map(m => m.codigo)).size
  }, [movimientos])
  const productosSinSaldoInicial = productosVisibles - codigosConSaldoInicial

  const resumenSaldosIniciales = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of movimientos) {
      if (!m.codigo) continue;
      if (m.es_saldo_inicial) {
         map.set(m.codigo, m.fecha);
      } else if (!map.has(m.codigo)) {
         map.set(m.codigo, ""); // track seen codigos without saldo inicial
      }
    }
    return Array.from(map.entries()).map(([codigo, fecha]) => ({
      codigo,
      fecha: fecha ? format(parseISO(fecha), "dd/MM/yyyy") : null,
      hasSaldo: !!fecha
    })).sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [movimientos]);

  const parseStringToDate = (dateStr?: string) => {
    if (!dateStr) return undefined
    const parsed = parseISO(dateStr)
    return isValid(parsed) ? parsed : undefined
  }

  if (!id) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-destructive bg-background">
      ⚠️ ID de procesamiento inválido.
    </div>
  )

  return (
    <>
      <style>{`
        @media print {
          .kardex-no-print { display: none !important; }
          body, html { background: white !important; color: black !important; }
        }
      `}</style>

      <div className="flex flex-col gap-5 p-4 lg:p-6 2xl:px-8 w-full max-w-[1800px] 2xl:max-w-[2100px] mx-auto animate-in fade-in duration-200">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4 text-left kardex-no-print">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Kardex Valorizado de Movimientos
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalRegistros.toLocaleString('es-PE')} transacciones calculadas bajo Costo Prom. Ponderado.
            </p>
          </div>
          
          {/* Action Bar / Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto bg-muted/20 border border-border/50 p-1.5 rounded-xl shadow-sm">
            
            {/* Buscador Global (Código) */}
            <div className="relative flex items-center pr-2 border-r border-border/50">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input 
                 placeholder="Buscar código..." 
                 value={draftCodigo}
                 onChange={e => setDraftCodigo(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && aplicarFiltros()}
                 className="h-8 w-[140px] md:w-[180px] pl-8 pr-8 text-xs bg-background/50 border-border/50 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/30 shadow-none"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden md:flex h-4 select-none items-center gap-1 rounded bg-muted/80 px-1 font-mono text-[10px] text-muted-foreground font-bold">
                ↵
              </div>
            </div>

            {/* Grupo 1: Filtros de Fecha y Alertas */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-border/50">
              {erroresIntegridad > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => kardexTableRef.current?.scrollToFirstAnomaly()}
                  className="h-8 text-xs font-semibold border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-lg"
                >
                  <AlertCircle className="size-3.5 mr-1" /> {erroresIntegridad} Anomalías
                </Button>
              )}
              
              <Popover open={filtrosAbiertos} onOpenChange={setFiltrosAbiertos}>
                <PopoverTrigger asChild>
                  <Button
                    variant={filtrosAbiertos ? "default" : "ghost"}
                    size="sm"
                    className={cn("h-8 text-xs rounded-lg gap-1.5 cursor-pointer", filtrosAbiertos ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/50")}
                  >
                    <Filter className="size-3.5" /> Filtro Fecha
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-4 rounded-xl shadow-2xl border-border/50 bg-popover" align="start">
                   <div className="space-y-4">
                     <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                       <CalendarIcon className="size-4 text-primary" />
                       <h4 className="text-sm font-semibold">Filtrar por Fecha</h4>
                     </div>
                     <div className="flex bg-muted/50 p-1 rounded-lg">
                       {(['anio_mes', 'exacta', 'rango'] as const).map(m => (
                         <Button key={m} variant="ghost" size="sm" onClick={() => setDraftFiltroFecha({ ...draftFiltroFecha, modo: m })}
                           className={cn("h-7 flex-1 text-[10px] rounded-md font-bold uppercase", draftFiltroFecha.modo === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
                         >
                           {{ anio_mes: 'Año/Mes', exacta: 'Exacta', rango: 'Rango' }[m]}
                         </Button>
                       ))}
                     </div>
                     
                     <div className="pt-2 flex flex-col gap-2">
                       {draftFiltroFecha.modo === 'anio_mes' && (
                         <div className="flex items-center gap-2">
                           <select value={draftFiltroFecha.anio ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, anio: e.target.value ? Number(e.target.value) : undefined })} className="h-9 w-full text-xs bg-card border border-input rounded-lg px-2 text-foreground outline-none cursor-pointer">
                             <option value="">Año</option>
                             {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(a => <option key={a} value={a}>{a}</option>)}
                           </select>
                           <select value={draftFiltroFecha.mes ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, mes: e.target.value ? Number(e.target.value) : undefined })} disabled={!draftFiltroFecha.anio} className="h-9 w-full text-xs bg-card border border-input rounded-lg px-2 text-foreground outline-none disabled:opacity-40 cursor-pointer">
                             <option value="">Mes</option>
                             {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'].map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                           </select>
                         </div>
                       )}

                       {draftFiltroFecha.modo === 'exacta' && (
                         <div className="flex flex-col gap-1.5">
                           <Label className="text-[10px] uppercase text-muted-foreground">Seleccionar día</Label>
                           <div className="flex items-center gap-2 bg-card border border-input rounded-lg px-2 focus-within:ring-1 focus-within:ring-primary/40">
                             <input type="date" value={draftFiltroFecha.fecha_exacta ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_exacta: e.target.value || undefined })} className="h-9 w-full text-xs bg-transparent border-none text-foreground outline-none shadow-none [&::-webkit-calendar-picker-indicator]:hidden" />
                           </div>
                         </div>
                       )}

                       {draftFiltroFecha.modo === 'rango' && (
                         <div className="flex flex-col gap-2">
                           <div className="flex flex-col gap-1.5">
                             <Label className="text-[10px] uppercase text-muted-foreground">Desde</Label>
                             <div className="flex items-center gap-2 bg-card border border-input rounded-lg px-2 focus-within:ring-1 focus-within:ring-primary/40">
                               <input type="date" value={draftFiltroFecha.fecha_desde ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_desde: e.target.value || undefined })} className="h-9 w-full text-xs bg-transparent border-none text-foreground outline-none shadow-none [&::-webkit-calendar-picker-indicator]:hidden" />
                             </div>
                           </div>
                           <div className="flex flex-col gap-1.5">
                             <Label className="text-[10px] uppercase text-muted-foreground">Hasta</Label>
                             <div className="flex items-center gap-2 bg-card border border-input rounded-lg px-2 focus-within:ring-1 focus-within:ring-primary/40">
                               <input type="date" value={draftFiltroFecha.fecha_hasta ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_hasta: e.target.value || undefined })} className="h-9 w-full text-xs bg-transparent border-none text-foreground outline-none shadow-none [&::-webkit-calendar-picker-indicator]:hidden" />
                             </div>
                           </div>
                         </div>
                       )}
                     </div>
                     
                     <div className="flex items-center gap-2 pt-3 border-t border-border/40 mt-2">
                       <Button size="sm" variant="outline" onClick={limpiarFiltros} className="h-8 flex-1 text-xs">Limpiar</Button>
                       <Button size="sm" onClick={() => { aplicarFiltros(); setFiltrosAbiertos(false); }} className="h-8 flex-1 text-xs font-bold bg-primary text-primary-foreground">Aplicar Rango</Button>
                     </div>
                   </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Grupo 2: Vista / Configuración */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-border/50">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs rounded-lg gap-1.5 cursor-pointer hover:bg-muted/50"
                  >
                    <SlidersHorizontal className="size-3.5" /> Configuración
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-0 rounded-xl bg-popover border border-border/50 shadow-2xl" align="end">
                  {/* Revisión Toggle */}
                  <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/10">
                    <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm font-semibold tracking-tight flex items-center gap-1.5">
                        <ShieldCheck className={cn("size-4", mostrarSemaforo ? "text-amber-500" : "text-muted-foreground")} />
                        Revisión (Semáforo)
                      </h4>
                      <p className="text-[10px] text-muted-foreground">Muestra iconos de estado por fila.</p>
                    </div>
                    <Button
                      variant={mostrarSemaforo ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMostrarSemaforo(v => !v)}
                      className={cn("h-7 px-3 text-xs rounded-md shadow-sm transition-colors cursor-pointer", mostrarSemaforo ? "bg-amber-500 text-amber-950 hover:bg-amber-600 border-amber-600" : "hover:bg-muted")}
                    >
                      {mostrarSemaforo ? "Activado" : "Desactivado"}
                    </Button>
                  </div>

                  {/* Tolerancia Form */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                        <SlidersHorizontal className="size-4 text-primary" />
                        Tolerancia Permitida
                        <InfoTooltip content="Representa la diferencia máxima permitida entre los valores calculados por el sistema y los valores registrados antes de marcar una inconsistencia." />
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Actual: <strong>{toleranciaModo === "custom" ? (toleranciaPersonalizada || "0.10") : toleranciaModo}</strong>. Establece el margen de redondeo aceptable (S/.). Las diferencias que superen este límite serán marcadas como alertas críticas.
                      </p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg p-2.5 text-[10px] leading-tight text-left">
                      ⚠️ <strong>Solo afecta a las alertas.</strong> Cambiar este margen no altera los datos del kardex, los saldos ni los costos registrados.
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                      <select 
                        value={toleranciaModo} 
                        onChange={e => setToleranciaModo(e.target.value)}
                        className="h-8 text-xs bg-card border border-input rounded-lg px-2 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40 cursor-pointer"
                      >
                        <option value="0.00">0.00 (Restricción Exacta)</option>
                        <option value="0.05">0.05 (Estricto)</option>
                        <option value="0.10">0.10 (Estándar recomendado)</option>
                        <option value="0.50">0.50 (Flexible)</option>
                        <option value="custom">Personalizado...</option>
                      </select>

                      {toleranciaModo === "custom" && (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Ej: 0.25"
                          value={toleranciaPersonalizada}
                          onChange={e => setToleranciaPersonalizada(e.target.value)}
                          className="h-8 text-xs bg-card px-3 rounded-lg"
                        />
                      )}

                      <Button 
                        size="sm" 
                        onClick={handleRevalidarTolerancia} 
                        disabled={revalidando}
                        className="w-full h-8 mt-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-amber-950 rounded-lg shadow-sm cursor-pointer transition-colors"
                      >
                        {revalidando ? <RefreshCw className="size-3.5 animate-spin mr-2" /> : <Check className="size-3.5 mr-2" />} 
                        Revalidar Anomalías
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Grupo 3: Exportar e Imprimir */}
            <div className="flex items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleImprimir}
                      disabled={movimientos.length === 0}
                      className="h-8 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-colors"
                    >
                      <Printer className="size-3.5 lg:mr-1.5" /> <span className="hidden lg:inline">PDF</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs">
                    Genera una vista optimizada en PDF lista para impresión (Kardex Fiscal).
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handleExportar}
                      disabled={exporting || movimientos.length === 0}
                      className="h-8 px-3 text-xs font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg cursor-pointer gap-1.5 ml-0.5 transition-colors"
                    >
                      {exporting ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Exportar Excel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-xs">
                    Descarga los datos actuales en formato Excel (.xlsx).
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

          </div>
        </div>

        <div className="kardex-no-print w-full">
          {alertas && <AlertaBanner alertas={alertas} erroresIntegridad={erroresIntegridad} />}
        </div>

        {metricas && (
          <div className="flex flex-col gap-3 kardex-no-print w-full mb-2">
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricCard label="Entradas" value={fmtS(metricas.total_ent_costo)} sub={`${fmt(metricas.total_ent_cantidad)} unds`} colorClass="text-blue-500" strokeColor="#2563eb" />
              <MetricCard label="Salidas" value={fmtS(metricas.total_sal_costo)} sub={`${fmt(metricas.total_sal_cantidad)} unds`} colorClass="text-rose-500" strokeColor="#e11d48" />
              <MetricCard label="Saldo de Cierre" value={fmtS(metricas.saldo_final_costo)} sub={`${fmt(metricas.saldo_final_cantidad)} unds`} colorClass="text-amber-500 dark:text-amber-400" strokeColor="#f59e0b" />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs px-4 py-2.5 rounded-xl text-left">
            ✕ {error}
          </div>
        )}

        <div className="w-full rounded-xl border border-border/50 bg-card/10 overflow-hidden">
          <div className="kardex-no-print p-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-3 bg-primary rounded-xs" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">Libro Electrónico de Movimientos</span>
              <Badge variant="secondary" className="text-[11px] bg-primary/10 border-primary/20 text-primary">
                {movimientos.length.toLocaleString('es-PE')} líneas
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              {mostrarSemaforo && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground/60 hidden sm:flex">
  
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-emerald-500" />
                    Correcto
                    <InfoTooltip
                      iconClassName="h-3 w-3"
                      content="El movimiento fue validado correctamente y no se detectaron inconsistencias."/>
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-amber-500" />
                    Advertencia
                    <InfoTooltip
                      iconClassName="h-3 w-3"
                      content="Se detectó un costo reconstruido o una diferencia que no supera el nivel de tolerancia configurado."/>
                  </span>

                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-500" />
                    Inconsistencia
                    <InfoTooltip
                      iconClassName="h-3 w-3"
                      content="Se detectaron diferencias fuera del nivel de tolerancia, errores de cálculo o problemas que requieren revisión."/>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Postgres Online</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground/60 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="size-5 animate-spin text-primary" />
              <span>Calculando saldos y reconstruyendo costos promedio...</span>
            </div>
          ) : (
            <KardexTable
              ref={kardexTableRef}
              movimientos={movimientos}
              mostrarSemaforo={mostrarSemaforo}
              empresaImpresion={empresaImpresion}
              preImpresion={preImpresion}
            />
          )}

          {movimientos.length > 0 && !loading && (
            <div className="kardex-no-print p-2 bg-muted/10 border-t border-border/40 text-left">
              <p className="text-xs text-muted-foreground/50 pl-2">
                Auditoría parcial: mostrando {movimientos.length.toLocaleString('es-PE')} de {totalRegistros.toLocaleString('es-PE')} registros en memoria.
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  )
}