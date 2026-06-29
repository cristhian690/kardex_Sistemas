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

const Sparkline = ({ color }: { color: string }) => {
  const pts = [20, 35, 28, 50, 42, 60, 55, 70, 65, 80, 72, 88]
  const w = 90, h = 32
  const max = Math.max(...pts), min = Math.min(...pts)
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w)
  const ys = pts.map(p => h - ((p - min) / (max - min)) * h * 0.8 - h * 0.1)
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-40 shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

interface MetricCardProps {
  label: string; value: string; sub: string; colorClass: string; strokeColor: string; tooltip?: string
}
const MetricCard = ({ label, value, sub, colorClass, strokeColor, tooltip }: MetricCardProps) => (
  <div className="flex-1 bg-card/30 backdrop-blur-md border border-border/50 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden min-w-[180px]">
    <div className="space-y-1 z-10 text-left">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{label}</span>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
      <h3 className={`text-2xl font-bold tracking-tight ${colorClass}`}>{value}</h3>
      <p className="text-xs text-muted-foreground/60">{sub}</p>
    </div>
    <div className="absolute right-4 bottom-3 z-0">
      <Sparkline color={strokeColor} />
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
      description: "Antes de generar un reporte o imprimir, aplica los filtros necesarios. El reporte se genera únicamente con la información actualmente visible. Además, recuerda configurar la orientación en 'Horizontal'.",
      duration: 6000,
      action: {
        label: 'Ver Manual',
        onClick: () => window.open('/manual.pdf', '_blank')
      }
    });
    setTimeout(() => {
      window.print()
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
    const codigos = Array.from(new Set(movimientos.map(m => m.codigo).filter(Boolean))) as string[];
    return codigos.map(cod => {
      const mov = movimientos.find(m => m.codigo === cod && m.es_saldo_inicial);
      return {
        codigo: cod,
        fecha: mov?.fecha ? format(parseISO(mov.fecha), "dd/MM/yyyy") : null,
        hasSaldo: !!mov
      };
    }).sort((a, b) => a.codigo.localeCompare(b.codigo));
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

      <div className="flex flex-col gap-5 p-4 lg:p-6 w-full max-w-[1100px] mx-auto animate-in fade-in duration-200">
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-4 text-left kardex-no-print">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Kardex Valorizado de Movimientos
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalRegistros.toLocaleString('es-PE')} transacciones calculadas bajo Costo Prom. Ponderado.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 self-end md:self-auto">
            {erroresIntegridad > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => kardexTableRef.current?.scrollToFirstAnomaly()}
                className="h-9 text-xs border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 rounded-xl"
              >
                <AlertCircle className="size-4 mr-1" /> {erroresIntegridad} Anomalías
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltrosAbiertos(v => !v)}
              className={cn("h-9 text-xs rounded-xl gap-1.5 cursor-pointer", filtrosAbiertos && "bg-primary/10 text-primary border-primary/30")}
            >
              <Filter className="size-3.5" /> Filtros
            </Button>


            {/* NUEVO: BOTÓN Y PANEL FLOTANTE DE TOLERANCIA */}
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-xs rounded-xl gap-1.5 cursor-pointer hover:bg-primary/5 hover:text-primary hover:border-primary/30"
      >
        <SlidersHorizontal className="size-3.5" /> Tolerancia: {toleranciaModo === "custom" ? (toleranciaPersonalizada || "0.10") : toleranciaModo}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80 p-4 rounded-xl bg-popover border border-border/50 shadow-2xl" align="end">
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            Tolerancia Permitida
            <InfoTooltip content="Representa la diferencia máxima permitida entre los valores calculados por el sistema y los valores registrados antes de marcar una inconsistencia." />
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Establece el margen de redondeo aceptable (S/.). Las diferencias que superen este límite serán marcadas como alertas críticas para detectar alteraciones manuales o descuadres injustificados en el Excel.
          </p>
        </div>

      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs leading-tight text-left">
        ⚠️ <strong>Solo afecta a las alertas.</strong> Cambiar este margen no altera los datos del kardex, los saldos ni los costos registrados.
      </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
          <select 
            value={toleranciaModo} 
            onChange={e => setToleranciaModo(e.target.value)}
            className="h-9 text-xs bg-card border border-input rounded-lg px-2 text-foreground outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
          >
            <option value="0.00">0.00 (Restricción Exacta - No recomen.)</option>
            <option value="0.05">0.05 (Estricto)</option>
            <option value="0.10">0.10 (Estándar recomendado)</option>
            <option value="0.50">0.50 (Flexible)</option>
            <option value="custom">Valor personalizado...</option>
          </select>

          {toleranciaModo === "custom" && (
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 0.25"
              value={toleranciaPersonalizada}
              onChange={e => setToleranciaPersonalizada(e.target.value)}
              className="h-9 text-xs bg-card px-3 rounded-lg"
            />
          )}

          <Button 
            size="sm" 
            onClick={handleRevalidarTolerancia} 
            disabled={revalidando}
            className="w-full h-9 mt-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-amber-950 rounded-lg shadow-sm"
          >
            {revalidando ? <RefreshCw className="size-3.5 animate-spin mr-2" /> : <Check className="size-3.5 mr-2" />} 
            Revalidar Anomalías
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarSemaforo(v => !v)}
              className={cn("h-9 text-xs rounded-xl gap-1.5 cursor-pointer", mostrarSemaforo && "bg-amber-500/10 text-amber-400 border-amber-500/30")}
            >
              <ShieldCheck className="size-3.5" /> Revisión
            </Button>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImprimir}
                    disabled={movimientos.length === 0}
                    className="h-9 text-xs text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl cursor-pointer"
                  >
                    <Printer className="size-3.5 mr-1" /> Reporte
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
                    className="h-9 text-xs font-semibold shadow-sm bg-primary text-primary-foreground rounded-xl cursor-pointer gap-1.5"
                  >
                    {exporting ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Exportar
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-xs">
                  Descarga los datos actuales en formato Excel (.xlsx).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="kardex-no-print w-full">
          {alertas && <AlertaBanner alertas={alertas} erroresIntegridad={erroresIntegridad} />}
        </div>

        {metricas && (
          <div className="flex flex-col gap-3 kardex-no-print w-full">
            <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Movimientos" value={totalRegistros.toLocaleString('es-PE')} sub="operaciones" colorClass="text-foreground" strokeColor="#3b82f6" tooltip="Cantidad total de transacciones (entradas y salidas) evaluadas en este periodo." />
              <MetricCard label="Total Entradas" value={fmtS(metricas.total_ent_costo)} sub={`${fmt(metricas.total_ent_cantidad)} unds`} colorClass="text-blue-400" strokeColor="#2563eb" tooltip="Suma del costo total de todas las entradas (compras, etc.) en el periodo filtrado." />
              <MetricCard label="Total Salidas" value={fmtS(metricas.total_sal_costo)} sub={`${fmt(metricas.total_sal_cantidad)} unds`} colorClass="text-red-400" strokeColor="#ef4444" tooltip="Suma del costo total de todas las salidas (ventas, despachos) en el periodo filtrado." />
              <MetricCard label="Saldo de Cierre" value={fmtS(metricas.saldo_final_costo)} sub={`${fmt(metricas.saldo_final_cantidad)} unds`} colorClass="text-amber-400" strokeColor="#f59e0b" tooltip="Valorización total del inventario al finalizar el periodo filtrado." />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] mt-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 text-muted-foreground">
                <Package className="size-3.5" />
                <span>Productos: <strong className="text-foreground">{productosVisibles}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 text-muted-foreground">
                <ListOrdered className="size-3.5" />
                <span>Movimientos: <strong className="text-foreground">{movimientosFiltrados}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 text-muted-foreground">
                <TrendingDown className={cn("size-3.5", codigosConNegativo > 0 && "text-red-500")} />
                <span>Con saldo negativo: <strong className={cn("text-foreground", codigosConNegativo > 0 && "text-red-600 dark:text-red-400")}>{codigosConNegativo}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50 text-muted-foreground">
                <FileWarning className={cn("size-3.5", productosSinSaldoInicial > 0 && "text-amber-500")} />
                <span>Sin saldo inicial: <strong className={cn("text-foreground", productosSinSaldoInicial > 0 && "text-amber-600 dark:text-amber-400")}>{productosSinSaldoInicial}</strong></span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1.5 h-auto px-2.5 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-medium ml-auto md:ml-0 hover:bg-blue-500/20 cursor-pointer shadow-none">
                    <CalendarIcon className="size-3.5" />
                    <span>Ver Fechas de Saldos Inic.</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 rounded-xl overflow-hidden shadow-xl border-border/50" align="end">
                  <div className="bg-muted/60 px-4 py-3 border-b border-border/50">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <CalendarIcon className="size-4 text-blue-500" />
                      Saldos Iniciales (BD)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">Resumen de la fecha de inicio tomada por producto.</p>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-card sticky top-0 border-b border-border/50 shadow-sm z-10">
                        <tr>
                          <th className="px-4 py-2 font-bold text-muted-foreground">Código</th>
                          <th className="px-4 py-2 font-bold text-muted-foreground">Fecha del Saldo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {resumenSaldosIniciales.map(r => (
                          <tr key={r.codigo} className="hover:bg-muted/40 transition-colors">
                            <td className="px-4 py-2 font-mono font-bold text-blue-600 dark:text-blue-400">{r.codigo}</td>
                            <td className="px-4 py-2 font-mono">
                              {r.hasSaldo ? (
                                <span className="text-foreground">{r.fecha}</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                                  <AlertTriangle className="size-3" /> No tiene
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {resumenSaldosIniciales.length === 0 && (
                          <tr>
                            <td colSpan={2} className="px-4 py-6 text-center text-sm text-muted-foreground">No hay productos visibles.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </PopoverContent>
              </Popover>
            </div>


          </div>
        )}

        {filtrosAbiertos && (
          <div className="kardex-no-print w-full flex flex-wrap items-center gap-4 bg-card/30 backdrop-blur-md border border-border/50 rounded-xl p-3 text-left">
            <div className="flex items-center gap-2 pr-2 border-r border-border/40">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Filtrar: </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground/80">Cód:</span>
              <Input value={draftCodigo} onChange={e => setDraftCodigo(e.target.value)} placeholder="011039" className="w-24 h-8 text-xs bg-card" />
            </div>

            <div className="flex items-center gap-1 border-l border-border/30 pl-2">
              {(['anio_mes', 'exacta', 'rango'] as const).map(m => (
                <Button key={m} variant="ghost" size="sm" onClick={() => setDraftFiltroFecha({ ...draftFiltroFecha, modo: m })}
                  className={cn("h-7 px-2.5 text-[10px] rounded-lg font-semibold tracking-tight uppercase", draftFiltroFecha.modo === m ? "bg-primary/10 text-primary" : "text-muted-foreground/60")}
                >
                  {{ anio_mes: 'Año/Mes', exacta: 'Exacta', rango: 'Rango' }[m]}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-l border-border/30 pl-2">
              {draftFiltroFecha.modo === 'anio_mes' && (
                <div className="flex items-center gap-1">
                  <select value={draftFiltroFecha.anio ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, anio: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs bg-card/50 border border-border rounded-lg px-2 text-foreground outline-none">
                    <option value="" className="bg-zinc-900">Año</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(a => <option key={a} value={a} className="bg-zinc-900">{a}</option>)}
                  </select>
                  <select value={draftFiltroFecha.mes ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, mes: e.target.value ? Number(e.target.value) : undefined })} disabled={!draftFiltroFecha.anio} className="h-8 text-xs bg-card/50 border border-border rounded-lg px-2 text-foreground outline-none disabled:opacity-40">
                    <option value="" className="bg-zinc-900">Mes</option>
                    {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'].map((m, i) => <option key={i+1} value={i+1} className="bg-zinc-900">{m}</option>)}
                  </select>
                </div>
              )}

              {/*FECHA EXACTA*/}
              {draftFiltroFecha.modo === 'exacta' && (
                <div className="flex items-center gap-1 bg-card border border-border rounded-lg pr-1 focus-within:ring-1 focus-within:ring-primary/40">
                  <input 
                    type="date" 
                    value={draftFiltroFecha.fecha_exacta ?? ''} 
                    onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_exacta: e.target.value || undefined })} 
                    className="h-8 text-xs bg-transparent border-none px-2 text-foreground outline-none shadow-none [&::-webkit-calendar-picker-indicator]:hidden" 
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-muted/80 text-muted-foreground/70 shrink-0 cursor-pointer">
                        <CalendarIcon className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-xl bg-popover border shadow-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={parseStringToDate(draftFiltroFecha.fecha_exacta)}
                        onSelect={(date) => 
                          setDraftFiltroFecha({ 
                            ...draftFiltroFecha, 
                            fecha_exacta: date ? format(date, "yyyy-MM-dd") : undefined 
                          })
                        }
                        captionLayout="dropdown"
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/*RANGO */}
              {draftFiltroFecha.modo === 'rango' && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-card border border-border rounded-lg pr-1 focus-within:ring-1 focus-within:ring-primary/40">
                    <input 
                      type="date" 
                      value={draftFiltroFecha.fecha_desde ?? ''} 
                      onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_desde: e.target.value || undefined })} 
                      className="h-8 text-xs bg-transparent border-none px-2 text-foreground outline-none shadow-none [&::-webkit-calendar-picker-indicator]:hidden" 
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-muted/80 text-muted-foreground/70 shrink-0 cursor-pointer">
                          <CalendarIcon className="size-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl bg-popover border shadow-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={parseStringToDate(draftFiltroFecha.fecha_desde)}
                          onSelect={(date) => 
                            setDraftFiltroFecha({ 
                              ...draftFiltroFecha, 
                              fecha_desde: date ? format(date, "yyyy-MM-dd") : undefined 
                            })
                          }
                          captionLayout="dropdown"
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <span className="text-muted-foreground/40">–</span>

                  <div className="flex items-center gap-1 bg-card border border-border rounded-lg pr-1 focus-within:ring-1 focus-within:ring-primary/40">
                    <input 
                      type="date" 
                      value={draftFiltroFecha.fecha_hasta ?? ''} 
                      onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_hasta: e.target.value || undefined })} 
                      className="h-8 text-xs bg-transparent border-none px-2 text-foreground outline-none shadow-none [&::-webkit-calendar-picker-indicator]:hidden" 
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-muted/80 text-muted-foreground/70 shrink-0 cursor-pointer">
                          <CalendarIcon className="size-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl bg-popover border shadow-xl" align="start">
                        <Calendar
                          mode="single"
                          selected={parseStringToDate(draftFiltroFecha.fecha_hasta)}
                          onSelect={(date) => 
                            setDraftFiltroFecha({ 
                              ...draftFiltroFecha, 
                              fecha_hasta: date ? format(date, "yyyy-MM-dd") : undefined 
                            })
                          }
                          captionLayout="dropdown"
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={limpiarFiltros} className="h-8 text-[11px] rounded-lg">Limpiar</Button>
              <Button size="sm" onClick={aplicarFiltros} className="h-8 text-[11px] rounded-lg font-bold">Aplicar</Button>
            </div>
          </div>
        )}

        <div className="kardex-no-print w-full text-left">
          {codigosVisibles.length > 0 && <BadgeProducto codigos={codigosVisibles} />}
        </div>

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