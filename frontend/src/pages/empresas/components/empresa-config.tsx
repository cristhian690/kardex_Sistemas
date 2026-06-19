"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Pencil, Trash2, Building2, Search, ChevronDown } from "lucide-react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Empresa {
  id:        number
  nombre:    string
  ruc:       string
  direccion: string | null
  creado_en: string
}

const EMPTY = {
  nombre:    '',
  ruc:       '',
  direccion: '',
}

export type EmpresaConfigHandle = { abrirCrear: () => void }

interface EmpresaConfigProps {
  onSelectedIdsChange: (ids: number[]) => void
}

const EmpresaConfig = forwardRef<EmpresaConfigHandle, EmpresaConfigProps>(({ onSelectedIdsChange }, ref) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [editando, setEditando] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  
  // Estados nativos de TanStack Table
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [globalFilter, setGlobalFilter] = useState("")

  const fetchEmpresas = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/v1/empresa/`)
      setEmpresas(await res.json())
    } catch (e) {
      console.error("Error al refrescar listado", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmpresas() }, [])

  const abrirCrear = () => {
    setForm({ ...EMPTY })
    setEditando(null)
    setMensaje(null)
    setModalAbierto(true)
  }

  useImperativeHandle(ref, () => ({ abrirCrear }))

  const abrirEditar = (e: Empresa) => {
    setForm({
      nombre:    e.nombre,
      ruc:       e.ruc,
      direccion: e.direccion ?? '',
    })
    setEditando(e.id)
    setMensaje(null)
    setModalAbierto(true)
  }

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre || !form.ruc) {
      setMensaje({ texto: 'Nombre y RUC son requeridos', tipo: 'error' })
      return
    }
    setSaving(true)
    setMensaje(null)
    try {
      const url    = editando ? `${API}/api/v1/empresa/${editando}` : `${API}/api/v1/empresa/`
      const method = editando ? 'PUT' : 'POST'
      const body   = {
        nombre:    form.nombre,
        ruc:       form.ruc,
        direccion: form.direccion || null,
      }

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'Error al guardar')

      setMensaje({ texto: editando ? 'Actualizado correctamente' : 'Empresa registrada', tipo: 'ok' })
      await fetchEmpresas()
      setTimeout(() => setModalAbierto(false), 900)
    } catch (e) {
      setMensaje({ texto: (e as Error).message, tipo: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta empresa?')) return
    setDeleting(id)
    try {
      await fetch(`${API}/api/v1/empresa/${id}`, { method: 'DELETE' })
      setRowSelection({}) // Limpia selección al mutar
      await fetchEmpresas()
    } finally {
      setDeleting(null)
    }
  }

  // 🟢 COLEGIO DE COLUMNAS REALES DE TANSTACK ADAPTADO PARA EMPRESAS
  const columns: ColumnDef<Empresa>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center px-2">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center px-2">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => <span className="font-semibold font-mono text-blue-500 dark:text-blue-400">{row.original.id}</span>
    },
    {
      accessorKey: "nombre",
      header: "Nombre / Razón Social",
      cell: ({ row }) => <span className="text-foreground font-medium">{row.original.nombre}</span>
    },
    {
      accessorKey: "ruc",
      header: "RUC",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ruc}</span>
    },
    {
      accessorKey: "direccion",
      header: "Dirección",
      cell: ({ row }) => <span className="text-muted-foreground font-sans text-xs">{row.original.direccion || "—"}</span>
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const emp = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            {emp.id === 1 ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                Sistema
              </span>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => abrirEditar(emp)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deleting === emp.id}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => handleEliminar(emp.id)}
                >
                  {deleting === emp.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]
  const valido = !!form.nombre.trim() && !!form.ruc.trim()
  // Instanciación oficial de la tabla TanStack
  const table = useReactTable({
    data: empresas,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
  })

  // Sincronización nativa de selección con el padre
  useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => row.original.id)
    onSelectedIdsChange(ids)
  }, [rowSelection, table, onSelectedIdsChange])

  return (
    <div className="w-full space-y-4">
      
      {/* Search Toolbar (Exacto a Saldos) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm text-left">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RUC o id..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 font-mono text-xs h-9"
          />
        </div>
        
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer text-xs h-9 rounded-xl bg-transparent">
                Columnas <ChevronDown className="ml-1.5 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize cursor-pointer"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Grilla Física de la Plantilla Semi-Transparente con TanStack ── */}
      <div className="rounded-xl border bg-card/30 backdrop-blur-md text-card-foreground shadow-2xs overflow-hidden border-border/50">
        <Table>
          <TableHeader className="bg-muted/20 font-mono text-xs border-b border-border/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/40">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-bold tracking-wider text-muted-foreground/90 py-3">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-sm font-mono text-muted-foreground/60">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-primary" /> Cargando pool corporativo...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"} 
                  className="hover:bg-muted/30 transition-colors border-b border-border/40 data-[state=selected]:bg-primary/5"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-sm font-mono text-muted-foreground/60">
                  Sin resultados para los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Selector de Paginación oficial de la plantilla */}
      <div className="flex items-center justify-between space-x-2 py-2 border-t border-border/40 font-medium">
        <div className="flex items-center space-x-2">
          <Label htmlFor="emp-page-size" className="text-xs text-muted-foreground font-medium">Mostrar</Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-18 h-8 text-xs font-mono shadow-2xs bg-transparent" id="emp-page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={`${size}`} className="font-mono text-xs">{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 text-xs text-muted-foreground hidden sm:block text-left pl-4">
          {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
        </div>

        <div className="flex items-center space-x-6">
          <div className="items-center space-x-1 hidden sm:flex text-xs text-muted-foreground">
            <span>Página</span>
            <strong className="text-foreground font-mono bg-muted/40 border border-border/50 px-2 py-0.5 rounded text-xs">
              {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </strong>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="cursor-pointer h-8 text-xs bg-transparent"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="cursor-pointer h-8 text-xs bg-transparent"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Diálogo Original */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="sm:max-w-[440px] text-left border-t-2 data-[edit=true]:border-t-amber-500 data-[edit=false]:border-t-blue-500" data-edit={!!editando}>
          <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary data-[edit=true]:bg-amber-500/10 data-[edit=true]:border-amber-500/20 data-[edit=true]:text-amber-500" data-edit={!!editando}>
                <Building2 className="size-4 text-current" />
              </div>
              <div className="flex flex-col gap-0.5">
                <DialogTitle className="text-base font-bold text-foreground">
                  {editando ? `Editar Empresa #${editando}` : 'Nueva Empresa'}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground">
                  {editando ? 'Modifica los credenciales de facturación corporativa.' : 'Inserta una nueva unidad para la asignación de Kardex.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleGuardar} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="e-nombre" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Nombre / Razón Social *</Label>
              <Input
                id="e-nombre"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: AGROPECUARIA SARAVIA S.R.LTDA"
                className="text-xs h-9 bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-ruc" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">R.U.C. *</Label>
              <Input
                id="e-ruc"
                value={form.ruc}
                onChange={e => setForm({ ...form, ruc: e.target.value })}
                placeholder="Ej: 20367775247"
                className="font-mono text-xs h-9 bg-card"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="e-dir" className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Dirección Fiscal</Label>
              <Input
                id="e-dir"
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
                placeholder="Ej: Av. Principal 123, Lima"
                className="text-xs h-9 bg-card"
              />
            </div>

            {mensaje && (
              <div className="flex items-center gap-2 border text-xs font-mono px-4 py-2.5 rounded-xl data-[tipo=error]:bg-destructive/10 data-[tipo=error]:border-destructive/20 data-[tipo=error]:text-destructive data-[tipo=ok]:bg-emerald-500/10 data-[tipo=ok]:border-emerald-500/20 data-[tipo=ok]:text-emerald-500" data-tipo={mensaje.tipo}>
                {mensaje.tipo === 'ok' ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
                <span>{mensaje.texto}</span>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" onClick={() => setModalAbierto(false)} className="cursor-pointer rounded-xl h-9 text-xs">
                Cancelar
              </Button>
              <Button type="submit" disabled={!valido || saving} className="cursor-pointer rounded-xl h-9 text-xs gap-2 font-semibold">
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  editando ? 'Actualizar' : 'Registrar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
})

EmpresaConfig.displayName = "EmpresaConfig"
export default EmpresaConfig