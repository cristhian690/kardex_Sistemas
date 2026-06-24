"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Trash2, AlertCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type Producto } from "./components/data-table"
import api from "@/services/api"  // ✅ axios con token automático

// Tu modal global corporativo actual
import ModalProducto from "@/components/ModalProducto"

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

  // ✅ axios con token
  const fetchEmpresas = async () => {
    try {
      const { data } = await api.get('/api/v1/empresa/')
      setEmpresas(data)
    } catch (e) {
      console.error("Error al cargar empresas en el maestro", e)
    }
  }

  // ✅ axios con token
  const fetchProductos = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/v1/productos/?limit=200&offset=0`
      if (busqueda.trim())
        url += `&search=${encodeURIComponent(busqueda.trim())}`
      if (empresaFiltro !== "todas") 
        url += `&empresa_id=${empresaFiltro}`

      const { data } = await api.get(url)
      setProductos(data.productos ?? [])
      setSelectedIds([])
    } catch (e: any) {
      setError(e?.message || "Error al cargar el catálogo de productos")
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
    fetchProductos()
  }

  // ✅ DELETE individual con axios (lleva el token)
  const handleEliminarIndividual = async (id: number) => {
    if (!confirm("¿Eliminar este producto? Solo procederá si no tiene movimientos registrados."))
      return
    
    const toastId = toast.loading("Removiendo producto de la base de datos...")
    try {
      const { data } = await api.delete(`/api/v1/productos/${id}`)
      toast.success(data?.mensaje || "Producto eliminado correctamente", { id: toastId })
      fetchProductos()
    } catch (e: any) {
      toast.error(e?.message || "Error al eliminar", { id: toastId })
    }
  }

  // ✅ DELETE bulk con axios (lleva el token)
  const handleEliminarSeleccionados = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`¿Eliminar ${selectedIds.length} producto(s) seleccionado(s)? Solo procederá en los que no tengan movimientos.`))
      return

    setEliminando(true)
    const toastId = toast.loading(`Eliminando lote de ${selectedIds.length} productos...`)

    try {
      const { data } = await api.delete('/api/v1/productos/bulk', {
        data: { ids: selectedIds },
      })

      let msg = `${data.total_eliminados} producto(s) eliminado(s) correctamente.`
      if (data.errores?.length > 0)
        msg += ` ${data.errores.length} omitidos (poseen movimientos en Kardex).`

      toast.success(msg, { id: toastId, duration: 4000 })
      fetchProductos()
    } catch (e: any) {
      toast.error(e?.message || "Error al procesar lote", { id: toastId })
    } finally {
      setEliminando(false)
    }
  }

  const hasSelection = selectedIds.length > 0

  return (
    <>
      <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-5xl mx-auto animate-in fade-in duration-200">
        
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

        {error && (
          <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-3 rounded-xl">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span>Alerta de Servidor: {error}</span>
          </div>
        )}

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

      <ModalProducto
        open={modalOpen}
        onClose={handleCerrarModal}
        onGuardado={handleGuardado}
        productoEditar={productoEditando}
      />
    </>
  )
}