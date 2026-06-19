"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/Badge"
import { FileSpreadsheet, ArrowRight } from "lucide-react"

interface ProcesamientoResumen {
  id: number
  nombre_archivo: string
  estado: "procesado" | "con_alertas" | "error"
  total_registros: number
  productos_procesados: number
  creado_en: string
}

interface HistorialCardProps {
  p: ProcesamientoResumen
  isSelected: boolean
  onToggleSelect: (id: number, e: React.MouseEvent<HTMLButtonElement>) => void
  onNavigate: (id: number) => void // 👈 Inyección de navegación real
  estadoConfig: Record<
    string,
    {
      label: string
      variant: "default" | "outline" | "destructive"
      className: string
    }
  >
  fmtFecha: (iso: string) => string
}

export function HistorialCard({
  p,
  isSelected,
  onToggleSelect,
  onNavigate,
  estadoConfig,
  fmtFecha,
}: HistorialCardProps) {
  const cfg = estadoConfig[p.estado] || estadoConfig.error

  return (
    <Card
      onClick={() => onNavigate(p.id)} // 🟢 Ahora sí te redirige en tu sistema
      className={`group cursor-pointer transition-all duration-200 border rounded-xl shadow-xs ${
        isSelected
          ? "bg-accent/60 dark:bg-white/[0.07] border-foreground/20 shadow-md scale-[1.002]"
          : "bg-card border-border/60 hover:bg-muted/40 hover:border-foreground/10"
      }`}
    >
      <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Selector Fila */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto border-b sm:border-b-0 pb-2 sm:pb-0 justify-between" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onToggleSelect(p.id, { stopPropagation: () => {} } as any)}
            className="border-muted-foreground/40 data-[state=checked]:bg-foreground data-[state=checked]:text-background cursor-pointer"
          />
          <span className="font-mono text-xs font-bold text-muted-foreground/50 sm:hidden">
            #{p.id}
          </span>
        </div>

        {/* Icono del Tipo de Archivo */}
        <div className="p-2.5 bg-foreground/[0.04] text-foreground/80 rounded-lg hidden sm:block group-hover:scale-105 transition-transform">
          <FileSpreadsheet className="h-5 w-5" />
        </div>

        {/* Cuerpo Informativo */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-muted-foreground/50 hidden sm:inline">
              #{p.id}
            </span>
            <h3 className="font-semibold text-sm tracking-tight text-card-foreground truncate max-w-xs md:max-w-md">
              {p.nombre_archivo}
            </h3>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
            {fmtFecha(p.creado_en)}
          </p>
        </div>

        {/* Bloque de Contadores e Indicadores */}
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-border/60">
          <Badge
            variant={cfg.variant}
            className={`font-medium text-[10px] tracking-wide px-2.5 py-0.5 rounded-full border ${cfg.className}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 flex-shrink-0 animate-pulse" />
            {cfg.label}
          </Badge>

          <div className="text-right">
            <p className="font-mono text-sm font-bold text-foreground/90">
              {p.total_registros.toLocaleString("es-PE")}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Movimientos
            </p>
          </div>

          <div className="text-right min-w-[70px]">
            <p className="font-mono text-sm font-bold text-foreground/80">
              {p.productos_procesados}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              Productos
            </p>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all hidden md:block" />
        </div>
      </CardContent>
    </Card>
  )
}