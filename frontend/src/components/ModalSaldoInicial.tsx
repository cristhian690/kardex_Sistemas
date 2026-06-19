"use client"

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle2, Loader2, DollarSign } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SaldoPayload {
  empresa_id:     number
  codigo:         string
  descripcion:    string
  fecha:          string
  cantidad:       number
  costo_unitario: number
}

interface SaldoExistente {
  id:             number
  codigo:         string
  descripcion?:   string
  fecha:          string
  cantidad:       number | string
  costo_unitario: number | string
  costo_total:    number | string
}

interface Props {
  open:          boolean
  empresaId:     number
  onClose:       () => void
  onGuardado?:   (codigo: string) => void
  saldoEditar?:  SaldoExistente | null
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

function parseFastApiError(data: any, status: number): string {
  if (!data?.detail) return `Error ${status}`
  if (typeof data.detail === 'string') return data.detail
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => {
      const campo = err.loc?.[err.loc.length - 1] || 'Campo'
      return `Error en ${campo}: ${err.msg}`
    }).join(' | ')
  }
  return JSON.stringify(data.detail)
}

async function crearSaldo(payload: SaldoPayload) {
  const res = await fetch(`${API}/api/v1/saldos/`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseFastApiError(data, res.status))
  return data
}

async function editarSaldo(id: number, payload: Omit<SaldoPayload, 'codigo'> & { costo_total?: number }) {
  const res = await fetch(`${API}/api/v1/saldos/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseFastApiError(data, res.status))
  return data
}

const toNum = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

export default function ModalSaldoInicial({ open, empresaId, onClose, onGuardado, saldoEditar }: Props) {
  const hoy        = new Date().toISOString().split('T')[0]
  const modoEditar = !!saldoEditar

  const [codigo,             setCodigo]             = useState('')
  const [descripcion,        setDescripcion]        = useState('')
  const [fecha,              setFecha]              = useState(hoy)
  const [cantidad,           setCantidad]           = useState('')
  const [costoUnit,          setCostoUnit]          = useState('')
  const [costoTotalOriginal, setCostoTotalOriginal] = useState<number | null>(null)
  const [camposModificados,  setCamposModificados]  = useState(false)

  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)
  const [advertencia, setAdvertencia] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    if (saldoEditar) {
      setCodigo(saldoEditar.codigo)
      setDescripcion(saldoEditar.descripcion ?? '')
      setFecha(saldoEditar.fecha)
      setCantidad(String(toNum(saldoEditar.cantidad)))
      setCostoUnit(String(toNum(saldoEditar.costo_unitario)))
      setCostoTotalOriginal(toNum(saldoEditar.costo_total))
      setCamposModificados(false)
    } else {
      setCodigo('')
      setDescripcion('')
      setFecha(hoy)
      setCantidad('')
      setCostoUnit('')
      setCostoTotalOriginal(null)
      setCamposModificados(false)
    }

    setError(null)
    setSuccess(false)
    setAdvertencia(null)
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [open, saldoEditar])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const costoTotal: number = (!modoEditar || camposModificados || costoTotalOriginal === null)
    ? toNum(cantidad) * toNum(costoUnit)
    : costoTotalOriginal

  const valido =
    codigo.trim() &&
    toNum(cantidad) > 0 &&
    toNum(costoUnit) > 0

  const handleCantidadChange = (val: string) => {
    setCantidad(val)
    setCamposModificados(true)
  }

  const handleCostoUnitChange = (val: string) => {
    setCostoUnit(val)
    setCamposModificados(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido || loading) return

    setLoading(true)
    setError(null)

    try {
      let res

      if (modoEditar && saldoEditar) {
        res = await editarSaldo(saldoEditar.id, {
          empresa_id:     empresaId,
          descripcion:    descripcion.trim(),
          fecha,
          cantidad:       toNum(cantidad),
          costo_unitario: toNum(costoUnit),
          costo_total:    costoTotal,
        })
      } else {
        res = await crearSaldo({
          empresa_id:     empresaId,
          codigo:         codigo.trim().toUpperCase(),
          descripcion:    descripcion.trim(),
          fecha,
          cantidad:       toNum(cantidad),
          costo_unitario: toNum(costoUnit),
        })
      }

      setAdvertencia(res.advertencia ?? null)
      setSuccess(true)
      onGuardado?.(codigo.trim().toUpperCase())
      setTimeout(() => onClose(), 1200)

    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[440px] text-left border-t-2 data-[edit=true]:border-t-amber-500 data-[edit=false]:border-t-blue-500" data-edit={modoEditar}>
        
        {/* Cabecera Premium */}
        <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary data-[edit=true]:bg-amber-500/10 data-[edit=true]:border-amber-500/20 data-[edit=true]:text-amber-500" data-edit={modoEditar}>
              <DollarSign className="size-4 text-current" />
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-base font-bold text-foreground">
                {modoEditar ? 'Editar saldo inicial' : 'Agregar saldo inicial'}
              </DialogTitle>
              <span className="text-xs text-muted-foreground font-medium">
                {modoEditar ? `Código: ${saldoEditar?.codigo}` : 'Stock base para cálculo CPP'}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Formulario adaptado visualmente */}
        <form onSubmit={handleGuardar} className="space-y-4 pt-1">
          
          <div className="space-y-1.5">
            <Label htmlFor="g-codigo" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Código</Label>
            <Input
              id="g-codigo"
              ref={inputRef}
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              disabled={modoEditar}
              placeholder="Ej: 011039"
              className="font-mono text-xs h-9 bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-descripcion" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Descripción</Label>
            <Input
              id="g-descripcion"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Nombre del producto (opcional)"
              className="text-xs h-9 bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="g-fecha" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Fecha</Label>
            <Input
              id="g-fecha"
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="font-mono text-xs h-9 bg-card"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-cantidad" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Cantidad</Label>
              <Input
                id="g-cantidad"
                type="number"
                step="any"
                value={cantidad}
                onChange={e => handleCantidadChange(e.target.value)}
                placeholder="0.000"
                className="font-mono text-xs h-9 bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-costo" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Costo unitario</Label>
              <Input
                id="g-costo"
                type="number"
                step="any"
                value={costoUnit}
                onChange={e => handleCostoUnitChange(e.target.value)}
                placeholder="0.000000"
                className="font-mono text-xs h-9 bg-card"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-muted/30 border border-border/50 rounded-xl p-3 shadow-3xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">Costo total calculado</span>
              {modoEditar && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider transition-colors duration-150 data-[mod=true]:text-amber-500 data-[mod=false]:text-emerald-500" data-mod={camposModificados}>
                  {camposModificados ? '⚠ recalculado' : '✓ valor original BD'}
                </span>
              )}
            </div>
            <span className="font-mono text-sm font-bold text-blue-500 dark:text-blue-400">
              S/. {costoTotal.toFixed(6)}
            </span>
          </div>

          {/* Mensajes del sistema */}
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-2.5 rounded-xl">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {advertencia && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-mono px-4 py-2.5 rounded-xl">
              <AlertCircle className="size-4 shrink-0" />
              <span>{advertencia}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono px-4 py-2.5 rounded-xl">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{modoEditar ? 'Actualizado correctamente' : 'Guardado correctamente'}</span>
            </div>
          )}

          {/* Footer del Formulario */}
          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer rounded-xl h-9 text-xs">
              Cancelar
            </Button>
            <Button type="submit" disabled={!valido || loading} className="cursor-pointer rounded-xl h-9 text-xs gap-2 font-semibold">
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                modoEditar ? 'Actualizar saldo' : 'Guardar saldo'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}