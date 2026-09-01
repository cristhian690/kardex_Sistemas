import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createPortal } from "react-dom"

export default function ManualUsuario() {
  const handlePrint = () => {
    window.print()
  }

  const manualContent = (
    <>
      {/* --- INICIO DEL CONTENIDO IMPRIMIBLE --- */}
        <div className="flex flex-col gap-10 bg-card p-10 rounded-xl border border-border/50 print-box text-left">

          {/* Portada */}
          <div className="text-center py-20 border-b border-border/40 print-cover">
            <h1 className="text-5xl font-black mb-4">Manual de Usuario</h1>
            <h2 className="text-2xl text-muted-foreground">Sistema Kardex V1.0</h2>
          </div>


          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              1. Introducción
            </h2>

            <p className="text-foreground/80 leading-relaxed">
              El Sistema Kardex Valorizado permite procesar movimientos de inventario
              utilizando el método de Costo Promedio Ponderado (CPP), calculando de forma
              automática los costos de entradas, salidas y saldos finales.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              El sistema está diseñado para trabajar con archivos Excel provenientes de
              diferentes fuentes, detectar inconsistencias, validar cálculos y generar
              reportes listos para revisión contable y administrativa.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              Además, conserva un historial de procesamientos, permite administrar
              productos y empresas, registrar múltiples saldos iniciales y recalcular
              información histórica cuando sea necesario.
            </p>
          </section>


          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              2. Empresas y Productos
            </h2>

            <p className="text-foreground/80 leading-relaxed">
              Los productos pueden estar asociados a una empresa para facilitar su organización y gestión. Si durante el procesamiento no se selecciona una empresa, los productos podrán ser asignados posteriormente desde el módulo de Productos.
            </p>
            
            <p className="text-foreground/80 leading-relaxed">
              <strong>Asignación automática por reprocesamiento:</strong> El sistema reasigna automáticamente la empresa de los productos marcados como "Sin Asignar" cuando se vuelve a procesar un archivo con esa empresa seleccionada. Esta es la forma más rápida de corregir productos huérfanos en masa.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              Cuando se procesa un archivo y el sistema encuentra códigos de productos que
              aún no existen en la base de datos, estos se registran automáticamente para
              evitar interrumpir el proceso. Posteriormente, se recomienda ingresar al módulo de Productos para completar la información faltante.
            </p>
            
            <p className="text-foreground/80 leading-relaxed">
              <strong>Asignación masiva:</strong> La interfaz de Productos permite la asignación masiva, seleccionando varias casillas a la vez para aplicar la misma empresa a múltiples registros.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              En el modelo de datos también encontrarás los campos <strong>Almacén</strong> (útil si manejas múltiples ubicaciones) y <strong>Código SUNAT</strong> (código estándar requerido para reportes tributarios), que puedes completar según tu necesidad.
            </p>
          </section>

          <div className="page-break" />


          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              3. Registro de Saldos Iniciales
            </h2>

            <p className="text-foreground/80 leading-relaxed">
              Los saldos iniciales representan el punto de partida para los cálculos del
              Kardex. Un mismo producto puede tener varios saldos iniciales registrados en
              diferentes fechas. Esto permite recalcular información histórica sin perder
              registros anteriores.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              Durante el procesamiento, el sistema buscará automáticamente el saldo inicial
              cuya fecha sea la más cercana y anterior al primer movimiento encontrado para
              dicho producto. Si no existe un saldo inicial válido, el sistema
              continuará el cálculo utilizando saldo cero y generará una alerta.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              Por este motivo, es importante registrar correctamente las fechas. Una fecha incorrecta puede provocar que se utilice un saldo diferente al esperado. <strong>Importante:</strong> Un saldo inicial registrado sin fecha será ignorado por completo durante el cálculo.
            </p>

            <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
              <li><strong>Registro manual:</strong> Mediante formulario.</li>
              <li><strong>Carga masiva:</strong> Mediante un archivo Excel que debe contener las columnas exactas según la plantilla (Código, Fecha, Cantidad, Costo Unitario/Total).</li>
              <li><strong>Edición y eliminación:</strong> Puedes modificar o eliminar cualquier saldo inicial previamente registrado desde las acciones en la tabla principal.</li>
            </ul>
          </section>


          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              4. Procesamiento de Movimientos
            </h2>

            <p className="text-foreground/80 leading-relaxed">
              Los archivos de movimientos contienen las compras, ventas y devoluciones
              que serán utilizadas para calcular el Kardex valorizado.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              <strong>Tipos de operación válidos:</strong> El sistema reconoce exclusivamente los tipos: <code>01</code> (Venta), <code>02</code> (Compra), <code>05</code> (Devolución Recibida) y <code>06</code> (Devolución Entregada). Una fila con una etiqueta distinta se descartará silenciosamente.
            </p>
            
            <p className="text-foreground/80 leading-relaxed">
              <strong>Formato del Excel de movimientos:</strong> El motor admite más de un formato mediante una detección automática de desplazamiento de columnas. Si el archivo no calza con ninguno de los formatos esperados, el procesamiento puede arrojar resultados vacíos o incorrectos.
            </p>

            <ol className="list-decimal list-inside text-foreground/80 space-y-2 ml-4">
              <li>Selecciona una empresa (opcional). Si no lo haces, los productos se registrarán como "Sin Asignar".</li>
              <li>Sube uno o varios archivos Excel.</li>
              <li>Verifica que los archivos cargados sean correctos. <strong>Atención:</strong> El sistema detectará si se suben archivos duplicados y generará una alerta.</li>
              <li>Haz clic en "Procesar Kardex".</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              5. Resultados y Validaciones
            </h2>

            <p className="text-foreground/80 leading-relaxed">
              Después del procesamiento, el sistema mostrará las validaciones detectadas.
            </p>

            <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
              <li>🟢 <strong>Correcto:</strong> No se detectaron inconsistencias.</li>
              <li>🟡 <strong>Advertencia (Error B):</strong> Diferencia matemática en el archivo original.</li>
              <li>🔴 <strong>Error (Error A):</strong> Los costos calculados difieren de los registrados.</li>
              <li>⚫ <strong>Crítico (Saldo Negativo):</strong> El stock quedó en negativo, requiere revisión inmediata.</li>
              <li>⚠️ <strong>Costo Reconstruido:</strong> Se ajustó un costo vacío/inválido con la información del movimiento.</li>
              <li>⚠️ <strong>Sin Saldo Inicial:</strong> No se encontró saldo inicial válido.</li>
              <li>⚠️ <strong>Duplicados:</strong> Se detectaron movimientos repetidos.</li>
            </ul>

            <p className="text-foreground/80 leading-relaxed">
              La <strong>tolerancia</strong> define el margen aceptable para diferencias de redondeo. Puede ajustarse desde la pantalla de resultados para realizar nuevos análisis sin necesidad de reprocesar.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              <strong>Exportación:</strong> Desde esta pantalla puedes exportar directamente los resultados a Excel.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              6. Historial de Procesamientos
            </h2>

            <p className="text-foreground/80 leading-relaxed">
              Todos los archivos procesados quedan almacenados en el historial. Esto permite consultar procesos sin volver a cargar los originales.
            </p>
            
            <p className="text-foreground/80 leading-relaxed">
              <strong>Reajuste de tolerancia:</strong> La tolerancia debe ajustarse inmediatamente después de procesar en la misma sesión. Una vez guardado en el historial, el proceso conserva la configuración final.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              <strong>Alcance de la eliminación:</strong> Al eliminar un registro del historial, se borra la referencia del archivo y todos los movimientos asociados a ese cálculo, manteniendo intactos los productos y saldos iniciales base.
            </p>
            
            <p className="text-foreground/80 leading-relaxed">
              <strong>Roles de usuario:</strong> Ten en cuenta que acciones destructivas (como eliminar procesos) pueden requerir privilegios específicos, como el rol de "Director", según los accesos configurados.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              7. Reportes e Impresión
            </h2>

            <p className="text-foreground/80 leading-relaxed">
              Antes de generar un reporte PDF o exportar, se recomienda utilizar los filtros (fechas, meses, productos) en la página de Movimientos.
            </p>

            <p className="text-foreground/80 leading-relaxed">
              <strong>Persistencia del reporte:</strong> El reporte filtrado se genera para visualizar o imprimir en el momento; no se guarda en el historial como una vista persistente.
            </p>
            
            <p className="text-foreground/80 leading-relaxed">
              <strong>Formatos de exportación:</strong> Puedes imprimir los reportes en formato PDF o exportar toda la información a un archivo Excel para auditorías.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              8. Recomendaciones
            </h2>

            <ul className="list-disc list-inside text-foreground/80 space-y-2 ml-4">
              <li>Verifica las fechas de los saldos iniciales antes de procesar para evitar cálculos con saldo cero (ver <strong>Sección 3</strong>).</li>
              <li>Revisa que no estés subiendo archivos duplicados antes de iniciar el cálculo.</li>
              <li>Asigna correctamente los productos a sus empresas para mantener ordenado tu catálogo (ver <strong>Sección 2</strong>).</li>
              <li>Analiza siempre los semáforos y alertas antes de exportar los reportes finales (ver <strong>Sección 5</strong>).</li>
              <li>Revisa periódicamente el historial y elimina procesos de prueba (ver <strong>Sección 6</strong>).</li>
              <li>Utiliza filtros para exportar o imprimir únicamente la información requerida (ver <strong>Sección 7</strong>).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold border-l-4 border-primary pl-4">
              9. Flujo Recomendado de Trabajo
            </h2>
            
            <p className="text-foreground/80 leading-relaxed mb-2">
              <em>¿Primera vez? Te sugerimos consultar primero el Centro de Ayuda o tomar el Tour guiado disponible en el sistema.</em>
            </p>

            <ol className="list-decimal list-inside text-foreground/80 space-y-2 ml-4">
              <li>Registrar empresas y saldos iniciales base.</li>
              <li>Subir los archivos de movimientos.</li>
              <li>Procesar el Kardex.</li>
              <li>Revisar alertas específicas: Costo Reconstruido, Sin Saldo Inicial, Duplicados y Saldos Negativos.</li>
              <li>Ajustar la tolerancia si es necesario para omitir errores de redondeo.</li>
              <li>Asignar nombres y empresas a productos nuevos.</li>
              <li>Generar reportes y exportar resultados definitivos.</li>
              <li>Eliminar o archivar del historial los procesos temporales para cerrar el ciclo de trabajo.</li>
            </ol>
          </section>

        </div>
    </>
  );

  return (
    <>
      <style>{`
        @media screen { .kp-section { display:none !important; } }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important; /* 1. MATA TODOS LOS TEXTOS, URL Y FECHAS DEL NAVEGADOR */
          }

          [data-sidebar="sidebar"],
          [data-slot="sidebar"],
          [data-collapsible],
          aside,
          header,
          footer,
          nav,
          .site-header,
          .site-footer {
            display: none !important;
            width: 0 !important;
          }

          #root {
            display: none !important;
          }

          body, html {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .ks-section { display: none !important; }
          .kp-section { display: block !important; }

          .kp-manual-block {
            box-sizing: border-box;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
          }
          .print-table thead {
            display: table-header-group;
          }
          .print-table tfoot {
            display: table-footer-group;
          }
          .print-table tbody, .print-table tr, .print-table td {
            page-break-inside: auto;
          }

          .print-box { 
            border: none !important; 
            background: white !important; 
            box-shadow: none !important; 
            padding: 0 !important;
            gap: 0 !important;
          }
          
          h1, h2, h3 { 
            color: #000 !important; 
            page-break-after: avoid; 
          }
          
          p, ul, ol, li { 
            color: #333 !important; 
            font-size: 11pt; 
            line-height: 1.6; 
            orphans: 3;
            widows: 3;
          }
          
          section { 
            page-break-inside: avoid; 
            margin-bottom: 2.5rem !important; 
          }
          
          .border-l-4 {
            border-left-width: 4px !important;
            border-color: #000 !important;
            padding-left: 12px !important;
            margin-bottom: 1rem !important;
          }

          .print-cover {
            height: 65vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border-bottom: none !important;
            page-break-after: always;
            margin-bottom: 0 !important;
            padding: 0 !important;
          }
          
          .print-cover h1 {
            font-size: 42pt !important;
            margin-bottom: 1.5rem !important;
            text-align: center;
          }
          
          .print-cover h2 {
            font-size: 20pt !important;
            color: #555 !important;
            text-align: center;
          }
          
          /* Evitar cortes feos en listas */
          ul, ol {
            page-break-inside: avoid;
          }

          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Vista en pantalla */}
      <div className="flex flex-col gap-6 p-4 lg:p-8 w-full max-w-4xl mx-auto ks-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 text-left">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Manual de Usuario PDF
            </h1>
            <p className="text-muted-foreground mt-1">
              Vista optimizada para impresión. Haz clic en "Imprimir PDF" para guardar este documento.
            </p>
          </div>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir PDF
          </Button>
        </div>
        {manualContent}
      </div>

      {/* Vista en impresión (inyectada en el body) */}
      {createPortal(
        <div className="kp-section w-full relative">
          <table className="print-table">
            <thead>
              <tr><td style={{ height: '2.5cm', border: 'none', padding: 0 }}></td></tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '0 2cm', border: 'none' }}>
                  {manualContent}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr><td style={{ height: '2cm', border: 'none', padding: 0 }}></td></tr>
            </tfoot>
          </table>
        </div>,
        document.body
      )}
    </>
  )
}
