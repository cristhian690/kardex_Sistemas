"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Trash2, AlertCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type Producto } from "./components/data-table"

// Tu modal global corporativo actual
import ModalProducto from "@/components/ModalProducto"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

interface Empresa {
  id: number
  nombre: string
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("todas")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [eliminando, setEliminando] = useState(false)
  
  // Estados de control para el Modal Global existente
  const [modalOpen, setModalOpen] = useState(false)
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)

  const fetchEmpresas = async () => {
    try {
      const res = await fetch(`${API}/api/v1/empresa/`)
      if (res.ok) setEmpresas(await res.json())
    } catch (e) {
      console.error("Error al cargar empresas en el maestro", e)
    }
  }

  const fetchProductos = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `${API}/api/v1/productos/?limit=200&offset=0`
      if (busqueda.trim())
        url += `&search=${encodeURIComponent(busqueda.trim())}`
      if (empresaFiltro !== "todas") 
        url += `&empresa_id=${empresaFiltro}`

      const res = await fetch(url)
      if (!res.ok) throw new Error("Error al cargar el catálogo de productos")
      const data = await res.json()
      setProductos(data.productos ?? [])
      setSelectedIds([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpresas()
  }, [])

  useEffect(() => {
    fetchProductos()
  }, [busqueda, empresaFiltro])

  const handleCerrarModal = () => {
    setModalOpen(false)
    setProductoEditando(null)
  }

  const handleGuardado = () => {
    setModalOpen(false)
    setProductoEditando(null)
    fetchProductos() // Recarga limpia desde Postgres
  }

  // Operación DELETE unitaria de tu sistema
  const handleEliminarIndividual = async (id: number) => {
    if (!confirm("¿Eliminar este producto? Solo procederá si no tiene movimientos registrados."))
      return
    
    const toastId = toast.loading("Removiendo producto de la base de datos...")
    try {
      const res = await fetch(`${API}/api/v1/productos/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || "Error al eliminar")
      
      toast.success(data?.mensaje || "Producto eliminado correctamente", { id: toastId })
      fetchProductos()
    } catch (e) {
      toast.error((e as Error).message, { id: toastId })
    }
  }

  // Operación POST real para la eliminación masiva (bulk) de tu sistema
  const handleEliminarSeleccionados = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`¿Eliminar ${selectedIds.length} producto(s) seleccionado(s)? Solo procederá en los que no tengan movimientos.`))
      return

    setEliminando(true)
    const toastId = toast.loading(`Eliminando lote de ${selectedIds.length} productos...`)

    try {
      const res = await fetch(`${API}/api/v1/productos/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || "Error al procesar lote")

      let msg = `${data.total_eliminados} producto(s) eliminado(s) correctamente.`
      if (data.errores?.length > 0)
        msg += ` ${data.errores.length} omitidos (poseen movimientos en Kardex).`

      toast.success(msg, { id: toastId, duration: 4000 })
      fetchProductos()
    } catch (e) {
      toast.error((e as Error).message, { id: toastId })
    } finally {
      setEliminando(false)
    }
  }

  const hasSelection = selectedIds.length > 0

  return (
    <>
      <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-5xl mx-auto animate-in fade-in duration-200">
        
        {/* Cabecera unificada y adaptada al diseño de plantilla sin BaseLayout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4 text-left">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Maestro de Productos</h1>
            <p className="text-sm text-muted-foreground">Catálogo maestro y asignación corporativa de existencias.</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasSelection && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEliminarSeleccionados}
                disabled={eliminando}
                className="gap-2 h-9 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                <Trash2 className="size-4" /> Eliminar ({selectedIds.length})
              </Button>
            )}
            
            <Button 
              size="sm" 
              onClick={() => { setProductoEditando(null); setModalOpen(true); }}
              className="cursor-pointer gap-2 font-semibold h-9 rounded-xl bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>
        </div>

        {/* Notificación de errores del servidor FastAPI */}
        {error && (
          <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-3 rounded-xl">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span>Alerta de Servidor: {error}</span>
          </div>
        )}

        {/* Contenedor de la Tabla con TanStack */}
        <div className="w-full">
          {loading && productos.length === 0 ? (
            <div className="space-y-3 text-left">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : (
            <DataTable
              productos={productos}
              empresas={empresas}
              busqueda={busqueda}
              setBusqueda={setBusqueda}
              empresaFiltro={empresaFiltro}
              setEmpresaFiltro={setEmpresaFiltro}
              onDelete={handleEliminarIndividual}
              onEdit={(prod) => { setProductoEditando(prod); setModalOpen(true); }}
              onSelectedIdsChange={setSelectedIds}
            />
          )}
        </div>
      </div>

      {/* Invoca tu modal global de productos conservando su comportamiento original */}
      <ModalProducto
        open={modalOpen}
        onClose={handleCerrarModal}
        onGuardado={handleGuardado}
        productoEditar={productoEditando}
      />
    </>
  )
}