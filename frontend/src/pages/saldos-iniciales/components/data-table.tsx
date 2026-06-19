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
import { ChevronDown, EllipsisVertical, Trash2, Search, Pencil } from "lucide-react"

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

export interface Saldo {
  id: number
  codigo: string
  descripcion: string
  fecha: string
  cantidad: number
  costo_unitario: number
  costo_total: number
}

interface DataTableProps {
  saldos: Saldo[]
  onDelete: (id: number) => void
  onEdit: (id: number, data: any) => void
  onSelectedIdsChange: (ids: number[]) => void
}

const fmt2 = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtFecha = (f: string) => {
  try { return new Date(f + 'T00:00:00').toLocaleDateString('es-PE') } catch { return f }
}

export function DataTable({ saldos, onDelete, onEdit, onSelectedIdsChange }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [globalFilter, setGlobalFilter] = useState("")

  const columns: ColumnDef<Saldo>[] = [
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
      accessorKey: "fecha",
      header: "Fecha",
      cell: ({ row }) => <span className="font-mono text-xs">{fmtFecha(row.original.fecha)}</span>
    },
    {
      accessorKey: "cantidad",
      header: () => <div className="text-right">Cantidad</div>,
      cell: ({ row }) => <div className="text-right font-mono">{fmt2(row.original.cantidad)}</div>
    },
    {
      accessorKey: "costo_unitario",
      header: () => <div className="text-right">Costo Unit.</div>,
      cell: ({ row }) => <div className="text-right font-mono text-muted-foreground">S/. {fmt2(row.original.costo_unitario)}</div>
    },
    {
      accessorKey: "costo_total",
      header: () => <div className="text-right">Costo Total</div>,
      cell: ({ row }) => <div className="text-right font-mono font-bold text-foreground">S/. {fmt2(row.original.costo_total)}</div>
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const saldo = row.original
        return (
          <div className="flex items-center justify-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(saldo.id, saldo)}
            >
              <Pencil className="size-4" />
              <span className="sr-only">Editar saldo</span>
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
                  onClick={() => onDelete(saldo.id)}
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
    data: saldos,
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

  useEffect(() => {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const ids = selectedRows.map(row => row.original.id)
    onSelectedIdsChange(ids)
  }, [rowSelection, table, onSelectedIdsChange])

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm text-left">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o desc..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 font-mono text-xs"
          />
        </div>
        
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer text-xs h-9 rounded-xl">
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

      {/* ── CAMBIO DE DISEÑO: Fondo transparente/translúcido acoplado al backend oscuro ── */}
      <div className="rounded-xl border bg-card/30 backdrop-blur-md text-card-foreground shadow-2xs overflow-hidden border-border/50">
        <Table>
          {/* Cabecera integrada ligeramente atenuada */}
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
                  Sin saldos iniciales registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-2 border-t border-border/40 font-medium">
        <div className="flex items-center space-x-2">
          <Label htmlFor="page-size" className="text-xs text-muted-foreground font-medium">Mostrar</Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-18 h-8 text-xs font-mono shadow-2xs bg-transparent" id="page-size">
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