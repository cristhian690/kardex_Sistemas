"use client"

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AlertCircle, Filter, ShieldCheck, Printer, Download, RefreshCw } from "lucide-react"
import { useKardex } from '@/hooks/useKardex'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/Badge"
import KardexTable, { type KardexTableHandle } from './components/kardex-table'

import { cn } from "@/lib/utils"
import AlertaBanner from '@/components/AlertaBanner'
import BadgeProducto from '@/components/BadgeProducto'
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
  label: string; value: string; sub: string; colorClass: string; strokeColor: string
}
const MetricCard = ({ label, value, sub, colorClass, strokeColor }: MetricCardProps) => (
  <div className="flex-1 bg-card/30 backdrop-blur-md border border-border/50 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden min-w-[180px]">
    <div className="space-y-1 z-10 text-left">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70">{label}</span>
      <h3 className={`text-2xl font-black font-mono tracking-tight ${colorClass}`}>{value}</h3>
      <p className="text-[10px] font-mono text-muted-foreground/50">{sub}</p>
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
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true)
  const [draftCodigo, setDraftCodigo] = useState('')
  const [draftFiltroFecha, setDraftFiltroFecha] = useState<IFiltroFecha>({ modo: 'anio_mes' })

  const id = Number(procesamiento_id)

  useEffect(() => { setDraftFiltroFecha(filtroFecha) }, [filtroFecha])

  useEffect(() => {
    const t = setTimeout(() => {
      if (draftCodigo === codigo) return
      setCodigo(draftCodigo)
      cargarKardex(id, { ...draftFiltroFecha, codigo: draftCodigo || undefined })
    }, 400)
    return () => clearTimeout(t)
  }, [draftCodigo])

  const aplicarFiltros = () => {
    setFiltroFecha(draftFiltroFecha)
    cargarKardex(id, { ...draftFiltroFecha, codigo: draftCodigo || undefined })
  }

  const limpiarFiltros = () => {
    const clean: IFiltroFecha = { modo: 'anio_mes' }
    setCodigo(''); setDraftCodigo('')
    setFiltroFecha(clean); setDraftFiltroFecha(clean)
    cargarKardex(id)
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

  const handleImprimir = async () => {
    // Si hay filtro de fecha activo, cargar todos los movimientos primero
    const hayFiltro = filtroFecha.anio || filtroFecha.mes || filtroFecha.fecha_desde || filtroFecha.fecha_hasta || codigo
    if (hayFiltro) {
      await cargarKardex(id, { codigo: codigo || undefined })
    }
    ;(window as any).__kardexPrepararImpresion?.()
    setTimeout(() => {
      window.print()
      setTimeout(() => {
        ;(window as any).__kardexTerminarImpresion?.()
        // Restaurar filtro original después de imprimir
        cargarKardex(id, { ...filtroFecha, codigo: codigo || undefined })
      }, 500)
    }, 300)
  }

  const codigosVisibles = useMemo(() => {
    const set = new Set(movimientos.map(m => m.codigo).filter(Boolean))
    return Array.from(set) as string[]
  }, [movimientos])

  if (!id) return (
    <div className="min-h-screen flex items-center justify-center font-mono text-sm text-destructive bg-background">
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              Kardex Valorizado <span className="text-primary">#{id}</span>
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarSemaforo(v => !v)}
              className={cn("h-9 text-xs rounded-xl gap-1.5 cursor-pointer", mostrarSemaforo && "bg-amber-500/10 text-amber-400 border-amber-500/30")}
            >
              <ShieldCheck className="size-3.5" /> Revisión
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImprimir}
              disabled={movimientos.length === 0}
              className="h-9 text-xs text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl cursor-pointer"
            >
              <Printer className="size-3.5 mr-1" /> Reporte
            </Button>
            <Button
              size="sm"
              onClick={handleExportar}
              disabled={exporting || movimientos.length === 0}
              className="h-9 text-xs font-semibold shadow-sm bg-primary text-primary-foreground rounded-xl cursor-pointer gap-1.5"
            >
              {exporting ? <RefreshCw className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Exportar
            </Button>
          </div>
        </div>

        <div className="kardex-no-print w-full">
          {alertas && <AlertaBanner alertas={alertas} erroresIntegridad={erroresIntegridad} />}
        </div>

        {metricas && (
          <div className="kardex-no-print w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Total Movimientos" value={totalRegistros.toLocaleString('es-PE')} sub="operaciones" colorClass="text-foreground" strokeColor="#3b82f6" />
            <MetricCard label="Total Entradas" value={fmtS(metricas.total_ent_costo)} sub={`${fmt(metricas.total_ent_cantidad)} unds`} colorClass="text-blue-400" strokeColor="#2563eb" />
            <MetricCard label="Total Salidas" value={fmtS(metricas.total_sal_costo)} sub={`${fmt(metricas.total_sal_cantidad)} unds`} colorClass="text-red-400" strokeColor="#ef4444" />
            <MetricCard label="Saldo de Cierre" value={fmtS(metricas.saldo_final_costo)} sub={`${fmt(metricas.saldo_final_cantidad)} unds`} colorClass="text-amber-400" strokeColor="#f59e0b" />
          </div>
        )}

        {filtrosAbiertos && (
          <div className="kardex-no-print w-full flex flex-wrap items-center gap-4 bg-card/30 backdrop-blur-md border border-border/50 rounded-xl p-3 text-left">
            <div className="flex items-center gap-2 pr-2 border-r border-border/40">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/60">Filtrar: </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-muted-foreground/80">Cód:</span>
              <Input value={draftCodigo} onChange={e => setDraftCodigo(e.target.value)} placeholder="011039" className="w-24 h-8 text-xs font-mono bg-card" />
            </div>

            <div className="flex items-center gap-1 border-l border-border/30 pl-2">
              {(['anio_mes', 'exacta', 'rango'] as const).map(m => (
                <Button key={m} variant="ghost" size="sm" onClick={() => setDraftFiltroFecha({ ...draftFiltroFecha, modo: m })}
                  className={cn("h-7 px-2.5 text-[10px] rounded-lg font-mono tracking-tight", draftFiltroFecha.modo === m ? "bg-primary/10 text-primary" : "text-muted-foreground/60")}
                >
                  {{ anio_mes: 'Año/Mes', exacta: 'Exacta', rango: 'Rango' }[m]}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-l border-border/30 pl-2 font-mono">
              {draftFiltroFecha.modo === 'anio_mes' && (
                <div className="flex items-center gap-1">
                  <select value={draftFiltroFecha.anio ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, anio: e.target.value ? Number(e.target.value) : undefined })} className="h-8 text-xs font-mono bg-card/50 border border-border rounded-lg px-2 text-foreground outline-none">
                    <option value="" className="bg-zinc-900">Año</option>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(a => <option key={a} value={a} className="bg-zinc-900">{a}</option>)}
                  </select>
                  <select value={draftFiltroFecha.mes ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, mes: e.target.value ? Number(e.target.value) : undefined })} disabled={!draftFiltroFecha.anio} className="h-8 text-xs font-mono bg-card/50 border border-border rounded-lg px-2 text-foreground outline-none disabled:opacity-40">
                    <option value="" className="bg-zinc-900">Mes</option>
                    {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'].map((m, i) => <option key={i+1} value={i+1} className="bg-zinc-900">{m}</option>)}
                  </select>
                </div>
              )}

              {draftFiltroFecha.modo === 'exacta' && (
                <input type="date" value={draftFiltroFecha.fecha_exacta ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_exacta: e.target.value || undefined })} className="h-8 text-xs font-mono bg-card border border-border rounded-lg px-2 text-foreground" />
              )}

              {draftFiltroFecha.modo === 'rango' && (
                <div className="flex items-center gap-1">
                  <input type="date" value={draftFiltroFecha.fecha_desde ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_desde: e.target.value || undefined })} className="h-8 text-xs font-mono bg-card border border-border rounded-lg px-2 text-foreground" />
                  <span className="text-muted-foreground/40">–</span>
                  <input type="date" value={draftFiltroFecha.fecha_hasta ?? ''} onChange={e => setDraftFiltroFecha({ ...draftFiltroFecha, fecha_hasta: e.target.value || undefined })} className="h-8 text-xs font-mono bg-card border border-border rounded-lg px-2 text-foreground" />
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
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-2.5 rounded-xl text-left">
            ✕ {error}
          </div>
        )}

        <div className="w-full rounded-xl border border-border/50 bg-card/10 overflow-hidden">
          <div className="kardex-no-print p-3 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-3 bg-primary rounded-xs" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Libro Electrónico de Movimientos</span>
              <Badge variant="secondary" className="font-mono text-[11px] bg-primary/10 border-primary/20 text-primary">
                {movimientos.length.toLocaleString('es-PE')} líneas
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              {mostrarSemaforo && (
                <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/60 hidden sm:flex">
                  {[{ bg: "bg-emerald-500", label: "OK" }, { bg: "bg-amber-500", label: "Reconstruido" }, { bg: "bg-red-500", label: "Error" }].map(item => (
                    <span key={item.label} className="flex items-center gap-1">
                      <span className={cn("w-1.5 h-1.5 rounded-full inline-block", item.bg)} />
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Postgres Online</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center font-mono text-xs text-muted-foreground/60 flex flex-col items-center justify-center gap-2">
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
              <p className="text-[10px] font-mono text-muted-foreground/50 pl-2">
                Auditoría parcial: mostrando {movimientos.length.toLocaleString('es-PE')} de {totalRegistros.toLocaleString('es-PE')} registros en memoria.
              </p>
            </div>
          )}
        </div>

      </div>
    </>
  )
}