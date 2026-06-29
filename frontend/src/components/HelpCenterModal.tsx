import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { HelpCircle, PlayCircle } from "lucide-react"
import { runGuidedTour } from "./GuidedTour"
import { useNavigate } from "react-router-dom"

interface HelpCenterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpCenterModal({ open, onOpenChange }: HelpCenterModalProps) {
  const navigate = useNavigate()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-6 w-6 text-primary" />
            Centro de Ayuda
          </DialogTitle>
          <DialogDescription>
            Resuelve tus dudas rápidas sobre el funcionamiento del sistema Kardex.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">¿Primera vez usando el sistema?</h4>
              <p className="text-xs text-muted-foreground">Inicia nuestro recorrido interactivo.</p>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                onOpenChange(false)
                if (window.location.pathname !== "/") {
                  navigate("/?startTour=true")
                } else {
                  runGuidedTour(true)
                }
              }}
            >
              <PlayCircle className="h-4 w-4" />
              Ver Tour
            </Button>
          </div>

          <div className="space-y-2 mt-2">
            <h4 className="font-semibold text-sm mb-2">Preguntas Frecuentes</h4>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm">
                  ¿Cómo usar el sistema paso a paso?
                </AccordionTrigger>

                <AccordionContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    <strong>1. Registrar saldos iniciales (Opcional):</strong> Puedes crear
                    saldos iniciales manualmente o mediante Excel. El sistema permite
                    registrar múltiples saldos iniciales por producto y utilizará el que
                    corresponda según la fecha del procesamiento.
                  </p>

                  <p>
                    <strong>2. Seleccionar empresa (Opcional):</strong> Puedes asignar una
                    empresa antes de procesar. Si no seleccionas ninguna, el sistema intentará
                    asociar automáticamente cada producto con su empresa registrada.
                  </p>

                  <p>
                    <strong>3. Cargar movimientos:</strong> Sube uno o varios archivos Excel
                    con compras, ventas y devoluciones del periodo.
                  </p>

                  <p>
                    <strong>4. Procesar Kardex:</strong> El sistema ordenará los movimientos
                    cronológicamente, identificará el saldo inicial aplicable y calculará el
                    Kardex valorizado utilizando el método de Costo Promedio Ponderado.
                  </p>

                  <p>
                    <strong>5. Revisar resultados:</strong> Analiza las alertas,
                    inconsistencias y saldos finales generados.
                  </p>

                  <p>
                    <strong>6. Exportar o imprimir:</strong> Puedes generar reportes,
                    exportar resultados a Excel o imprimir únicamente la información
                    filtrada.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm">
                  ¿Qué significan las alertas e inconsistencias?
                </AccordionTrigger>

                <AccordionContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    <strong>Error A:</strong> El costo calculado por el sistema presenta una
                    diferencia superior a la tolerancia configurada respecto a los costos
                    registrados en el archivo original.
                  </p>

                  <p>
                    <strong>Error B:</strong> El archivo original contiene inconsistencias
                    matemáticas entre cantidades, costos unitarios y costos totales.
                  </p>

                  <p>
                    <strong>Saldo Negativo:</strong> Se registró una salida de inventario
                    superior al stock disponible en ese momento.
                  </p>

                  <p>
                    <strong>Sin Saldo Inicial:</strong> El producto no tenía un saldo inicial
                    registrado antes de la fecha de los movimientos procesados.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm">
                  ¿Para qué sirve la tolerancia?
                </AccordionTrigger>

                <AccordionContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    La tolerancia permite definir qué diferencias monetarias serán aceptadas
                    antes de marcar una inconsistencia.
                  </p>

                  <p>
                    Por ejemplo, una tolerancia de S/ 0.10 permitirá ignorar diferencias
                    menores o iguales a diez céntimos producidas por redondeos o criterios de
                    cálculo distintos.
                  </p>

                  <p>
                    Si una diferencia supera la tolerancia configurada, el sistema generará
                    las alertas correspondientes.
                  </p>

                  <p>
                    Puedes modificar la tolerancia desde la pantalla de resultados para
                    actualizar la validación sin necesidad de reprocesar los archivos.
                  </p>
                </AccordionContent>
              </AccordionItem>

              

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-sm">
                  ¿Qué significa "Costo Reconstruido"?
                </AccordionTrigger>

                <AccordionContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    El sistema marca un movimiento como "Costo Reconstruido" cuando el archivo
                    original no contiene suficiente información para validar el costo.
                  </p>

                  <p>
                    En estos casos se utilizan los datos disponibles, como el costo promedio
                    vigente o costos previamente registrados, para continuar el cálculo del
                    Kardex sin interrumpir el procesamiento.
                  </p>

                  <p>
                    Esta marca no necesariamente indica un error, pero sí señala que la
                    información original estaba incompleta o no permitía una validación
                    directa.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
  <AccordionTrigger className="text-sm">
    ¿Qué ocurre si proceso productos nuevos?
  </AccordionTrigger>

  <AccordionContent className="text-xs text-muted-foreground space-y-2">
    <p>
      Si un archivo contiene códigos de productos que aún no existen en el
      sistema, estos serán creados automáticamente durante el procesamiento.
    </p>

    <p>
      Posteriormente deberás ingresar a la sección de Productos para asignarles
      un nombre descriptivo y asociarlos a la empresa correspondiente.
    </p>
  </AccordionContent>
</AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-sm">
                  ¿Cómo se elige el saldo inicial correcto?
                </AccordionTrigger>

                <AccordionContent className="text-xs text-muted-foreground space-y-2">
                  <p>
                    El sistema permite registrar múltiples saldos iniciales para un mismo
                    producto.
                  </p>

                  <p>
                    Durante el procesamiento se seleccionará automáticamente el saldo inicial
                    cuya fecha sea la más cercana y anterior a los movimientos que se están
                    calculando.
                  </p>

                  <p>
                    Por ello es importante registrar correctamente las fechas de cada saldo
                    inicial.
                  </p>
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
