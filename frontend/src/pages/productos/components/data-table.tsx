"use client"

import { useState, useEffect } from "react"
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
import { ChevronDown, EllipsisVertical, Trash2, Search, Pencil, Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

export interface Producto {
  id: number
  empresa_id: number
  codigo: string
  descripcion?: string
  codigo_existencia?: string;
  unidad_medida?: string;
  almacen?: string;
  creado_en: string;
  total_saldos?: number; 
}

interface Empresa {
  id: number
  nombre: string
}

interface DataTableProps {
  productos: Producto[]
  empresas: Empresa[]
  busqueda: string
  setBusqueda: (val: string) => void
  empresaFiltro: string
  setEmpresaFiltro: (val: string) => void
  onDelete: (id: number) => void
  onEdit: (producto: Producto) => void
  onSelectedIdsChange: (ids: number[]) => void
}

export function DataTable({
  productos,
  empresas,
  busqueda,
  setBusqueda,
  empresaFiltro,
  setEmpresaFiltro,
  onDelete,
  onEdit,
  onSelectedIdsChange
}: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})

  const getNombreEmpresa = (empresa_id: number): string => {
    const empresa = empresas.find((e) => e.id === empresa_id)
    return empresa?.nombre ?? `Empresa #${empresa_id}`
  }

  const columns: ColumnDef<Producto>[] = [
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
      accessorKey: "codigo",
      header: "Código",
      cell: ({ row }) => <span className="font-semibold font-mono text-blue-500 dark:text-blue-400">{row.original.codigo}</span>
    },
    {
      accessorKey: "descripcion",
      header: "Descripción",
      cell: ({ row }) => <span className="text-muted-foreground font-medium">{row.original.descripcion || "—"}</span>
    },
    {
      accessorKey: "empresa_id",
      header: "Empresa Asignada",
      cell: ({ row }) => {
        const esSinAsignar = row.original.empresa_id === 1
        return esSinAsignar ? (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            ⚠️ SIN ASIGNAR
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {getNombreEmpresa(row.original.empresa_id)}
          </span>
        )
      }
    },
    {
      accessorKey: "almacen",
      header: "Almacén",
      cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground/90 font-medium">{row.original.almacen || "—"}</span>
    },
    {
      accessorKey: "unidad_medida",
      header: "U.M.",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.unidad_medida || "NIU"}</span>
    },
    {
      accessorKey: "codigo_existencia",
      header: "Código SUNAT",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.codigo_existencia || "01"}</span>
    },
    {
      id: "saldos_count",
      header: "N° de Saldos",
      cell: ({ row }) => {
        const count = row.original.total_saldos ?? 0
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
            count > 0 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
          }`}>
            {count} {count === 1 ? "saldo" : "saldos"}
          </span>
        )
      }
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const producto = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(producto)}
            >
              <Pencil className="size-4" />
              <span className="sr-only">Editar producto</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground">
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => onDelete(producto.id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: productos,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
  })

  useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => row.original.id)
    onSelectedIdsChange(ids)
  }, [rowSelection, table, onSelectedIdsChange])

  return (
    <div className="w-full space-y-4">
      {/* Search + Select Filters Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 text-left">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o desc..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9 font-mono text-xs h-9"
            />
          </div>

          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger className="w-full sm:w-[220px] h-9 text-xs font-mono bg-card/40 border-border/50">
              <SelectValue placeholder="🏢 Todas las empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs font-mono">🏢 Todas las empresas</SelectItem>
              {empresas.map((emp) => (
                <SelectItem key={emp.id} value={String(emp.id)} className="text-xs font-mono">
                  {emp.id === 1 ? "⚠️ " : ""}{emp.name || emp.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Tabla */}
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
            {table.getRowModel().rows.length ? (
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
                  Sin productos en los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between space-x-2 py-2 border-t border-border/40 font-medium">
        <div className="flex items-center space-x-2">
          <Label htmlFor="prod-page-size" className="text-xs text-muted-foreground font-medium">Mostrar</Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-18 h-8 text-xs font-mono shadow-2xs bg-transparent" id="prod-page-size">
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
    </div>
  )
}