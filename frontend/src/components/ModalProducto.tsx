"use client"

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Package } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/services/api"  // ✅ axios con token automático

interface ProductoPayload {
  empresa_id: number
  codigo: string
  descripcion: string | null
  codigo_existencia: string | null
  unidad_medida: string | null
  almacen: string | null
}

interface ProductoExistente {
  id: number
  empresa_id: number
  codigo: string
  descripcion?: string | null
  codigo_existencia?: string | null
  unidad_medida?: string | null
  almacen?: string | null 
}

interface Empresa {
  id: number
  nombre: string
}

interface Props {
  open: boolean
  onClose: () => void
  onGuardado?: () => void
  productoEditar?: ProductoExistente | null
}

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

export default function ModalProducto({ open, onClose, onGuardado, productoEditar }: Props) {
  const modoEditar = !!productoEditar

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaIdSelect, setEmpresaIdSelect] = useState<string>('')
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [codExistencia, setCodExistencia] = useState('01')
  const [unidadMedida, setUnidadMedida] = useState('NIU')
  const [almacen, setAlmacen] = useState('') 

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  // ✅ axios con token
  const cargarEmpresas = async () => {
    try {
      const { data } = await api.get('/api/v1/empresa/')
      setEmpresas(data)
      if (data.length > 0 && !productoEditar) {
        setEmpresaIdSelect(String(data[0].id))
      }
    } catch (e) {
      console.error("Error obteniendo pool corporativo", e)
    }
  }

  useEffect(() => {
    if (open) cargarEmpresas()
  }, [open])

  useEffect(() => {
    if (!open) return

    if (productoEditar) {
      setEmpresaIdSelect(String(productoEditar.empresa_id))
      setCodigo(productoEditar.codigo)
      setDescripcion(productoEditar.descripcion ?? '')
      setCodExistencia(productoEditar.codigo_existencia ?? '01')
      setUnidadMedida(productoEditar.unidad_medida ?? 'NIU')
      setAlmacen(productoEditar.almacen ?? '')
    } else {
      setCodigo('')
      setDescripcion('')
      setCodExistencia('01')
      setUnidadMedida('NIU')
      setAlmacen('') 
      if (empresas.length > 0) setEmpresaIdSelect(String(empresas[0].id))
    }

    setError(null)
    setSuccess(false)
    setTimeout(() => inputRef.current?.focus(), 120)
  }, [open, productoEditar])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const valido = codigo.trim() && empresaIdSelect !== ''

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido || loading) return

    setLoading(true)
    setError(null)

    const payload: ProductoPayload = {
      empresa_id: Number(empresaIdSelect),
      codigo: codigo.trim().toUpperCase(),
      descripcion: descripcion.trim() || null,
      codigo_existencia: codExistencia.trim() || '01',
      unidad_medida: unidadMedida.trim() || 'NIU',
      almacen: almacen.trim() || null,
    }

    try {
      if (modoEditar && productoEditar) {
        // ✅ axios PATCH con token
        await api.patch(`/api/v1/productos/${productoEditar.id}`, payload)
      } else {
        // ✅ axios POST con token
        await api.post('/api/v1/productos/', payload)
      }

      setSuccess(true)
      onGuardado?.()
      setTimeout(() => onClose(), 1200)
    } catch (e: any) {
      setError(e?.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[440px] text-left border-t-2 data-[edit=true]:border-t-amber-500 data-[edit=false]:border-t-blue-500" data-edit={modoEditar}>
        
        <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary data-[edit=true]:bg-amber-500/10 data-[edit=true]:border-amber-500/20 data-[edit=true]:text-amber-500" data-edit={modoEditar}>
              <Package className="size-4 text-current" />
            </div>
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-base font-bold text-foreground">
                {modoEditar ? 'Reasignar / Editar Producto' : 'Registrar Nuevo Producto'}
              </DialogTitle>
              <span className="text-xs text-muted-foreground font-medium">
                {modoEditar ? `ID Correlativo: #${productoEditar?.id}` : 'Inserción manual en el maestro corporativo'}
              </span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleGuardar} className="space-y-4 pt-1">
          
          <div className="space-y-1.5">
            <Label htmlFor="p-empresa" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Empresa de Asignación *</Label>
            <Select value={empresaIdSelect} onValueChange={setEmpresaIdSelect}>
              <SelectTrigger id="p-empresa" className="h-9 text-xs font-mono bg-card w-full">
                <SelectValue placeholder="Seleccione empresa corporativa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)} className="text-xs font-mono">
                    {emp.id === 1 ? "⚠️ " : ""}{emp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-codigo" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Código de Existencia *</Label>
            <Input
              id="p-codigo"
              ref={inputRef}
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              disabled={modoEditar}
              placeholder="Ej: 011004"
              className="font-mono text-xs h-9 bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-desc" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Descripción de Producto</Label>
            <Input
              id="p-desc"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: FURALTADONA HCL-01"
              className="text-xs h-9 bg-card"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-almacen" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Almacén de Resguardo</Label>
            <Input
              id="p-almacen"
              value={almacen}
              onChange={e => setAlmacen(e.target.value)}
              placeholder="Ej: ALMACÉN CENTRAL PRINCIPAL"
              className="text-xs h-9 bg-card font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-unidad" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Unidad Medida</Label>
              <Input
                id="p-unidad"
                value={unidadMedida}
                onChange={e => setUnidadMedida(e.target.value)}
                placeholder="Ej: NIU o KGM"
                className="font-mono text-xs h-9 bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-tipo" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Tipo Existencia Sunat</Label>
              <Input
                id="p-tipo"
                value={codExistencia}
                onChange={e => setCodExistencia(e.target.value)}
                placeholder="Ej: 01"
                className="font-mono text-xs h-9 bg-card"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-2.5 rounded-xl animate-in fade-in duration-150">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-mono px-4 py-2.5 rounded-xl animate-in fade-in duration-150">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{modoEditar ? 'Registro reclasificado con éxito' : 'Producto insertado en catálogo'}</span>
            </div>
          )}

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
                modoEditar ? 'Reclasificar ítem' : 'Guardar Producto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}