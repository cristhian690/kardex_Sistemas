import { AlertTriangle, BookOpen, Calculator, Info, PackageX } from "lucide-react"

export default function GuiaInconsistencias() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-8 w-full max-w-5xl mx-auto animate-in fade-in duration-200">

      <div className="flex flex-col gap-2 border-b border-border/40 pb-6 text-left">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          Guía de Inconsistencias
        </h1>
        <p className="text-muted-foreground">
          Aprende a interpretar las validaciones, alertas e inconsistencias detectadas durante el procesamiento de tus archivos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Error A */}
        <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Error A (Diferencia de Costos)</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Se detecta cuando los costos calculados por el sistema son diferentes a los
            costos registrados en el archivo original. Esto puede ocurrir porque los
            valores fueron modificados manualmente o porque el cálculo original no sigue
            las reglas del Costo Promedio Ponderado.
          </p>
          <div className="bg-muted/40 p-3 rounded-lg mt-auto text-xs text-muted-foreground">
            <strong>Ejemplo:</strong> El sistema calcula un costo de salida de S/ 150.00,
            pero el archivo original registra S/ 160.00 para el mismo movimiento.
          </div>
        </div>

        {/* Error B */}
        <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
              <Calculator className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Error B (Inconsistencia Matemática)</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Ocurre cuando los cálculos internos de un movimiento no son correctos. El
            sistema verifica que la relación entre cantidad, costo unitario y costo total
            sea matemáticamente válida.
          </p>
          <div className="bg-muted/40 p-3 rounded-lg mt-auto text-xs text-muted-foreground">
            <strong>Ejemplo:</strong> Una compra registra 10 unidades con costo unitario
            de S/ 5.00, pero el costo total indicado es S/ 40.00 en lugar de S/ 50.00.
          </div>
        </div>

        {/* Saldo Negativo */}
        <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/20 text-red-600 rounded-lg">
              <PackageX className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Saldo Negativo</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Se produce cuando una salida de inventario supera la cantidad disponible
            según los movimientos procesados y los saldos iniciales registrados.
          </p>
          <div className="bg-muted/40 p-3 rounded-lg mt-auto text-xs text-muted-foreground">
            <strong>Posibles causas:</strong> faltan compras, faltan saldos iniciales o
            existen movimientos registrados en fechas incorrectas.
          </div>
        </div>

        {/* Costo Reconstruido */}
        <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <Info className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Costo Reconstruido</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            El sistema detectó que el movimiento no contenía información suficiente de
            costos y realizó una reconstrucción automática utilizando el último costo
            válido disponible o el costo promedio vigente.
          </p>
          <div className="bg-muted/40 p-3 rounded-lg mt-auto text-xs text-muted-foreground">
            <strong>Recomendación:</strong> revisa el archivo original para verificar si
            faltan costos unitarios o costos totales que deberían haberse registrado.
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Info className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              Tolerancia de Validación
            </h3>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            La tolerancia define el margen permitido para diferencias pequeñas
            producidas por redondeos o criterios distintos de cálculo.
          </p>

          <div className="bg-muted/40 p-3 rounded-lg mt-auto text-xs text-muted-foreground">
            <strong>Ejemplo:</strong> si la tolerancia es S/ 0.10, una diferencia de
            S/ 0.05 no será considerada una inconsistencia.
          </div>
        </div>

      </div>
    </div>
  )
}
