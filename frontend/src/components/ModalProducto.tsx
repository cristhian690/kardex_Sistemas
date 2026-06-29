"use client"

import { useState, useEffect, useRef } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Package, Check, ChevronsUpDown } from "lucide-react"

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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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

async function crearProducto(payload: ProductoPayload) {
  const res = await fetch(`${API}/api/v1/productos/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseFastApiError(data, res.status))
  return data
}

async function editarProducto(id: number, payload: ProductoPayload) {
  const res = await fetch(`${API}/api/v1/productos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(parseFastApiError(data, res.status))
  return data
}

export default function ModalProducto({ open, onClose, onGuardado, productoEditar }: Props) {
  const modoEditar = !!productoEditar

  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaIdSelect, setEmpresaIdSelect] = useState<string>('')
  const [openEmpresa, setOpenEmpresa] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [codExistencia, setCodExistencia] = useState('01')
  const [unidadMedida, setUnidadMedida] = useState('NIU')
  const [almacen, setAlmacen] = useState('') 

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const cargarEmpresas = async () => {
    try {
      const res = await fetch(`${API}/api/v1/empresa/`)
      if (res.ok) {
        const list: Empresa[] = await res.json()
        setEmpresas(list)
        if (list.length > 0 && !productoEditar) {
          setEmpresaIdSelect(String(list[0].id))
        }
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
        await editarProducto(productoEditar.id, payload)
      } else {
        await crearProducto(payload)
      }

      setSuccess(true)
      onGuardado?.()
      setTimeout(() => onClose(), 1200)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent 
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        className="sm:max-w-[440px] text-left border-t-2 data-[edit=true]:border-t-amber-500 data-[edit=false]:border-t-blue-500" data-edit={modoEditar}>
        
        {/* Cabecera Premium del Catálogo */}
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

        {/* Cuerpo del Formulario Global */}
        <form onSubmit={handleGuardar} className="space-y-4 pt-1">
          
          {/* Select de Empresas Asignadas */}
          <div className="space-y-1.5 flex flex-col">
            <Label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Empresa de Asignación *</Label>
            <Popover open={openEmpresa} onOpenChange={setOpenEmpresa}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEmpresa}
                  className="h-9 justify-between text-xs font-mono bg-card w-full px-3"
                >
                  <span className="truncate">
                    {empresaIdSelect
                      ? empresas.find((emp) => String(emp.id) === empresaIdSelect)?.nombre
                      : "Seleccione empresa corporativa..."}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[390px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar empresa..." className="text-xs" />
                  <CommandList>
                    <CommandEmpty>No se encontró ninguna empresa.</CommandEmpty>
                    <CommandGroup>
                      {empresas.map((emp) => (
                        <CommandItem
                          key={emp.id}
                          value={emp.nombre}
                          onSelect={() => {
                            setEmpresaIdSelect(String(emp.id))
                            setOpenEmpresa(false)
                          }}
                          className="text-xs font-mono"
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              empresaIdSelect === String(emp.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {emp.id === 1 ? "⚠️ " : ""}{emp.nombre}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Input Código de Existencia */}
          <div className="space-y-1.5">
            <Label htmlFor="p-codigo" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Código de Existencia *</Label>
            <Input
              id="p-codigo"
              ref={inputRef}
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              disabled={modoEditar}
              placeholder="Ej: 011004"
              className="font-mono text-xs h-9 bg-card"
            />
          </div>

          {/* Input Descripción */}
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

          {/* NUEVO: Input de Almacén Fijo Asignado */}
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

          {/* Fila Unidad Medida y Tipo Existencia */}
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

          {/* Bloque de Notificaciones de Feedback */}
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

          {/* Footer de Acciones */}
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