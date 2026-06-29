"use client"

import { useEffect, useState } from "react"
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Inbox, AlertCircle } from "lucide-react"

// Importación de submódulos locales estables
import { HistorialToolbar } from "./components/historial-toolbar"
import { HistorialCard } from "./components/historial-card"

// Conexión real con tu API en FastAPI
import { getHistorial, eliminarProcesamientosMultiple } from '@/services/kardex'
import type { ProcesamientoResumen, ApiError } from '@/types'

const estadoConfig = {
  procesado: {
    label: "Exitoso",
    variant: "default" as const,
    className:
      "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20",
  },
  con_alertas: {
    label: "Con alertas",
    variant: "outline" as const,
    className:
      "bg-amber-500/10 text-amber-500 hover:bg-amber-500/10 border-amber-500/20",
  },
  error: {
    label: "Error",
    variant: "destructive" as const,
    className:
      "bg-destructive/10 text-destructive hover:bg-destructive/10 border-destructive/20",
  },
}

const fmtFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

export default function HistorialPage() {
  const navigate = useNavigate()
  const [procesamientos, setProcesamientos] = useState<ProcesamientoResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null) // Control de excepciones de red
  const [pagina, setPagina] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [eliminando, setEliminando] = useState(false)
  const LIMIT = 20

  // Petición real asíncrona a tu base de datos PostgreSQL
  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistorial(LIMIT, (pagina - 1) * LIMIT)
      setProcesamientos(data)
      setSelectedIds(new Set())
    } catch (err) {
      const e = err as ApiError
      setError(e.message || 'Error al conectar con el servidor de Kardex')
    }  finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [pagina])

  const handleToggleSelectRow = (
    id: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === procesamientos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(procesamientos.map((p) => p.id)))
    }
  }

  // Operación DELETE fiscal real conectada a tus servicios de Python
  const handleEliminar = async () => {
    if (selectedIds.size === 0) return
    const cantidad = selectedIds.size
    const msg =
      cantidad === 1
        ? "¿Eliminar este procesamiento? Esta acción no se puede deshacer."
        : `¿Eliminar ${cantidad} procesamientos? Esta acción no se puede deshacer.`

    if (!window.confirm(msg)) return

    setEliminando(true)
    const toastId = toast.loading(`Eliminando ${cantidad} procesamiento(s)...`)
    try {
      const result = await eliminarProcesamientosMultiple(Array.from(selectedIds))
      toast.success(`${result.eliminados} procesamiento(s) eliminado(s) con éxito`, { id: toastId })
      await cargar() 
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar registros del servidor', { id: toastId })
    } finally {
      setEliminando(false)
    }
  }

  const allSelected =
    procesamientos.length > 0 && selectedIds.size === procesamientos.length
  const hasSelection = selectedIds.size > 0

  return (
    <>
      <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-5xl mx-auto">
        
        <div className="flex flex-col gap-1 text-left border-b border-border/40 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Actividad</h1>
          <p className="text-sm text-muted-foreground">
            Historial completo de procesamientos e importaciones registradas.
          </p>
        </div>

        {/* Banner de error por si falla la conexión con FastAPI */}
        {error && (
          <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-3 rounded-xl animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span>Alerta de Servidor: {error}</span>
          </div>
        )}

        {/* Componente Barra de Herramientas */}
        <HistorialToolbar
          procesamientosLength={procesamientos.length}
          allSelected={allSelected}
          toggleSelectAll={toggleSelectAll}
          hasSelection={hasSelection}
          eliminando={eliminando}
          selectedCount={selectedIds.size}
          onEliminar={handleEliminar}
          onNuevoProceso={() => navigate('/')}
        />

        {/* Contenedor del Feed Cronológico */}
        <div className="space-y-3">
          {/* Skeletons para Carga */}
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-dashed">
                <CardContent className="flex items-center p-4 gap-4">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </CardContent>
              </Card>
            ))}

          {/* Estado Vacío */}
          {!loading && !error && procesamientos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card/40 border-dashed gap-3">
              <div className="p-4 bg-muted rounded-full">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No hay procesamientos registrados
              </p>
            </div>
          )}

          {/* Renderizado de las Tarjetas Modulares Reales */}
          {!loading && !error &&
            procesamientos.map((p) => (
              <HistorialCard
                key={p.id}
                p={p}
                isSelected={selectedIds.has(p.id)}
                onToggleSelect={handleToggleSelectRow}
                onNavigate={(id) => navigate(`/kardex/${id}`)}
                estadoConfig={estadoConfig}
                fmtFecha={fmtFecha}
              />
            ))}
        </div>

        {/* Paginación Sincronizada Original (Letras y Selectors intactos) */}
        {!loading && !error && procesamientos.length > 0 && (
          <div className="flex items-center justify-between space-x-2 py-4 w-full border-t border-border/40 mt-4">
            <div className="flex items-center space-x-2">
              <label
                htmlFor="historial-page-size"
                className="text-sm font-medium text-muted-foreground"
              >
                Mostrar
              </label>
              <Select value={`${LIMIT}`} disabled>
                <SelectTrigger
                  className="w-20 cursor-pointer"
                  id="historial-page-size"
                >
                  <SelectValue placeholder={LIMIT} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectItem value={`${LIMIT}`}>{LIMIT}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 text-sm text-muted-foreground hidden sm:block text-left">
              {selectedIds.size} de {procesamientos.length} fila(s)
              seleccionadas.
            </div>

            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2 hidden sm:flex">
                <p className="text-sm font-medium text-muted-foreground">
                  Página
                </p>
                <strong className="text-sm font-semibold">
                  {pagina} de{" "}
                  {Math.max(1, Math.ceil(procesamientos.length / LIMIT))}
                </strong>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="cursor-pointer"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => p + 1)}
                  disabled={procesamientos.length < LIMIT}
                  className="cursor-pointer"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}