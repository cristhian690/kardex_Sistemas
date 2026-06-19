"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Trash2, AlertCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "./components/data-table"

// 🟢 IMPORTADO TU MODAL GLOBAL OFICIAL ADAPTADO
import ModalSaldoInicial from "@/components/ModalSaldoInicial"

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface Saldo {
  id:             number
  codigo:         string
  descripcion?:   string
  fecha:          string
  cantidad:       number
  costo_unitario: number
  costo_total:    number
}

export default function SaldosIniciales() {
  const [saldos, setSaldos] = useState<Saldo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [eliminando, setEliminando] = useState(false)

  // 🟢 ESTADOS PARA CONTROLAR EL MODAL GLOBAL
  const [modalOpen, setModalOpen] = useState(false)
  const [saldoEditando, setSaldoEditando] = useState<any | null>(null)

  // Fetch real conectado a tu FastAPI de Python
  const fetchSaldos = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/v1/saldos/`)
      if (!res.ok) throw new Error('Error al cargar saldos base del servidor')
      const data = await res.json()
      setSaldos(data)
      setSelectedIds([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSaldos()
  }, [])

  // Callback que se ejecuta cuando el modal termina de Guardar/Actualizar con éxito
  const handleModalGuardado = (codigo: string) => {
    fetchSaldos() // Refresca la grilla con los datos de PostgreSQL
  }

  const handleCerrarModal = () => {
    setModalOpen(false)
    setSaldoEditando(null)
  }

  // Operación DELETE individual real de tu sistema
  const handleDeleteReal = async (id: number) => {
    if (!confirm('¿Seguro que deseas eliminar este saldo?')) return
    const toastId = toast.loading("Removiendo saldo de la base de datos...")
    try {
      const res = await fetch(`${API}/api/v1/saldos/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar')
      
      if (data?.advertencia) toast.error(data.advertencia)
      toast.success(data?.mensaje || 'Eliminado correctamente', { id: toastId })
      fetchSaldos()
    } catch (e) {
      toast.error((e as Error).message, { id: toastId })
    }
  }

  // Operación POST real para la eliminación múltiple en lote
  const handleEliminarMultipleReal = async () => {
    if (selectedIds.length === 0) return
    const cantidad = selectedIds.length
    const msg = cantidad === 1
      ? '¿Eliminar este saldo? Esta acción no se puede deshacer.'
      : `¿Eliminar ${cantidad} saldos? Esta acción no se puede deshacer.`

    if (!confirm(msg)) return

    setEliminando(true)
    const toastId = toast.loading(`Eliminando ${cantidad} saldos en lote...`)
    try {
      const res = await fetch(`${API}/api/v1/saldos/eliminar-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar lote')

      toast.success(`${data?.eliminados || cantidad} eliminado(s) con éxito`, { id: toastId })
      fetchSaldos()
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
        
        {/* Cabecera unificada sin BaseLayout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4 text-left">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Saldos Iniciales</h1>
            <p className="text-sm text-muted-foreground">Stock base para cálculo de costo promedio ponderado (CPP).</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasSelection && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEliminarMultipleReal}
                disabled={eliminando}
                className="gap-2 h-9 rounded-xl text-xs font-semibold shadow-sm cursor-pointer"
              >
                <Trash2 className="size-4" /> Eliminar ({selectedIds.length})
              </Button>
            )}
            
            {/* Botón Principal que levanta el modal global en modo CREACIÓN */}
            <Button 
              size="sm" 
              onClick={() => { setSaldoEditando(null); setModalOpen(true); }}
              className="cursor-pointer gap-2 font-semibold h-9 rounded-xl bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Nuevo saldo
            </Button>
          </div>
        </div>

        {/* Notificación de error de red con FastAPI */}
        {error && (
          <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-3 rounded-xl">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span>Alerta de Servidor: {error}</span>
          </div>
        )}

        {/* Tabla Modular de TanStack */}
        <div className="w-full">
          {loading ? (
            <div className="space-y-3 text-left">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : (
            <DataTable
              saldos={saldos}
              onDelete={handleDeleteReal}
              // Cuando le das editar a una fila, setea el registro y abre el modal
              onEdit={async (id, data) => { setSaldoEditando({ id, ...data }); setModalOpen(true); }}
              onSelectedIdsChange={setSelectedIds}
            />
          )}
        </div>
      </div>

      {/* 🟢 RENDEREADO DEL MODAL GLOBAL CONECTADO AL ESTADO MAESTRO */}
      <ModalSaldoInicial
        open={modalOpen}
        empresaId={1} // ID fijo según tu lógica original
        onClose={handleCerrarModal}
        onGuardado={handleModalGuardado}
        saldoEditar={saldoEditando}
      />
    </>
  )
}