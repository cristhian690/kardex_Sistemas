"use client"

import { useEffect, useState, useRef } from "react"
import toast from "react-hot-toast"
import { Trash2, AlertCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
// Ya no necesitas importar el Skeleton aquí si dejas que el hijo maneje su carga interna

import EmpresaConfig, { type EmpresaConfigHandle } from "./components/empresa-config"

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export default function Empresas() {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 🟢 Cambiado a false por defecto para evitar el delay artificial
  const [loading, setLoading] = useState(false) 
  
  const empresaRef = useRef<EmpresaConfigHandle>(null)

  // 🟢 Eliminamos por completo el useEffect con el setTimeout

  const handleEliminarMultipleReal = async () => {
    if (selectedIds.length === 0) return
    const cantidad = selectedIds.length
    
    if (!confirm(`¿Eliminar ${cantidad} empresa(s) seleccionada(s)? Esta acción no se puede deshacer.`)) return

    setEliminando(true)
    const toastId = toast.loading(`Eliminando ${cantidad} empresas en lote...`)
    try {
      const res = await fetch(`${API}/api/v1/empresa/eliminar-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail || 'Error al eliminar lote corporativo')

      toast.success(`${data?.eliminados || cantidad} eliminado(s) correctamente`, { id: toastId })
      
      // Forzar recarga disparando el fetch interno del hijo mediante un F5 controlado o recarga de ruta
      window.location.reload() 
    } catch (e) {
      // Si tu API aún no soporta el endpoint bulk global, se procesa de manera unitaria controlada
      toast.loading("Procesando remoción unitaria en lote...", { id: toastId })
      try {
        await Promise.all(
          selectedIds.map(id => fetch(`${API}/api/v1/empresa/${id}`, { method: 'DELETE' }))
        )
        toast.success("Lote removido con éxito", { id: toastId })
        window.location.reload()
      } catch (err) {
        toast.error((e as Error).message, { id: toastId })
      }
    } finally {
      setEliminando(false)
    }
  }

  const hasSelection = selectedIds.length > 0

  return (
    <>
      <div className="flex flex-col gap-6 p-4 lg:p-6 w-full max-w-5xl mx-auto animate-in fade-in duration-200">
        
        {/* Cabecera unificada */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4 text-left">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Empresas</h1>
            <p className="text-sm text-muted-foreground">Configura los datos de empresa por código de producto.</p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasSelection && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEliminarMultipleReal}
                disabled={eliminando}
                className="gap-2 h-9 rounded-xl text-xs font-semibold shadow-sm cursor-pointer animate-in zoom-in-95 duration-150"
              >
                <Trash2 className="size-4" /> Eliminar ({selectedIds.length})
              </Button>
            )}
            
            <Button 
              size="sm" 
              onClick={() => empresaRef.current?.abrirCrear()}
              className="cursor-pointer gap-2 font-semibold h-9 rounded-xl bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Nueva empresa
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono px-4 py-3 rounded-xl text-left">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span>Alerta de Servidor: {error}</span>
          </div>
        )}
        <div className="w-full">
          <EmpresaConfig 
            ref={empresaRef} 
            onSelectedIdsChange={setSelectedIds} 
          />
        </div>
      </div>
    </>
  )
}