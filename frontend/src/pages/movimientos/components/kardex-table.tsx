"use client";

import {
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface KardexRow {
  id: number;
  fila: number;
  codigo: string;
  fecha: string;
  tipo_comprobante?: string;
  serie?: string;
  numero?: string;
  tipo_operacion?: string;
  ent_cantidad: number;
  ent_costo_unit: number;
  ent_costo_total: number;
  sal_cantidad: number;
  sal_costo_unit: number;
  sal_costo_total: number;
  saldo_cantidad: number;
  saldo_costo_unit: number;
  saldo_costo_total: number;
  es_saldo_inicial?: boolean;
  saldo_negativo?: boolean;
  sin_saldo_inicial?: boolean;
  error_a?: boolean;
  error_b?: boolean;
  costo_reconstruido?: boolean;
  producto?: {
    descripcion?: string;
    unidad_medida?: string;
    empresa?: {
      id: number;
      nombre: string;
      ruc: string;
      direccion: string | null;
    };
  };
}

export type KardexTableHandle = {
  scrollToFirstAnomaly: () => void;
  scrollToCodigo: (codigo: string) => void;
};

interface KardexTableProps {
  movimientos: KardexRow[];
  mostrarSemaforo?: boolean;
  empresaImpresion?: {
    razon_social: string;
    ruc: string;
    establecimiento: string;
    tipo: string;
    metodo_valuacion: string;
  } | null;
}

const fmtCant = (n: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
const fmtUnit = (n: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(n);
const fmtTotal = (n: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
const fmtFecha = (fecha: string) => {
  try { return new Date(fecha + "T00:00:00").toLocaleDateString("es-PE"); }
  catch { return fecha; }
};

const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const FILAS_POR_PAGINA = 100;

const getSemaforo = (row: KardexRow) => {
  if (row.saldo_negativo) return { badge: "🔴", text: "Stock Negativo" };
  if (row.sin_saldo_inicial) return { badge: "⚫", text: "Sin Saldo Inicial" };
  if (row.error_b) return { badge: "🔴", text: "Inconsistencia Excel" };
  if (row.error_a) return { badge: "🟡", text: "Dato Recalculado" };
  if (row.costo_reconstruido) return { badge: "🟦", text: "Costo Reconstruido" };
  return { badge: "🟢", text: "Conforme" };
};

const getRowTooltipDescription = (row: KardexRow): string => {
  if (row.saldo_negativo) return "Se registró una salida cuando el producto ya no tenía stock suficiente.";
  if (row.sin_saldo_inicial) return "El producto no tiene saldo inicial registrado.";
  if (row.error_b) return "El Excel presenta diferencias matemáticas entre cantidad, costo unitario y total.";
  if (row.error_a) return "El valor original estaba vacío o incompleto; el sistema reconstruyó el costo.";
  if (row.costo_reconstruido) return "El sistema completó el costo porque el Excel no traía un valor confiable.";
  return "Operación procesada correctamente.";
};

function getMesKey(fecha: string) {
  const d = new Date(fecha + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function agruparPorProductoMes(movimientos: KardexRow[]): ProductoBlock[] {
  const porCodigo = new Map<string, KardexRow[]>();
  for (const m of movimientos) {
    const key = String(m.codigo ?? "SIN_CODIGO");
    if (!porCodigo.has(key)) porCodigo.set(key, []);
    porCodigo.get(key)!.push(m);
  }
  const bloques: ProductoBlock[] = [];
  for (const [codigo, filas] of porCodigo) {
    const saldoInicialRow = filas.find((f) => f.es_saldo_inicial);
    const movRows = filas.filter((f) => !f.es_saldo_inicial);
    const porMes = new Map<string, KardexRow[]>();
    for (const f of movRows) {
      const key = getMesKey(f.fecha);
      if (!porMes.has(key)) porMes.set(key, []);
      porMes.get(key)!.push(f);
    }
    const mesesOrdenados = Array.from(porMes.keys()).sort();
    let saldoCant = saldoInicialRow?.saldo_cantidad ?? 0;
    let saldoUnit = saldoInicialRow?.saldo_costo_unit ?? 0;
    let saldoTotal = saldoInicialRow?.saldo_costo_total ?? 0;
    const meses: MesBlock[] = [];
    for (const mesKey of mesesOrdenados) {
      const [anioStr, mesStr] = mesKey.split("-");
      const anio = Number(anioStr);
      const mes = Number(mesStr);
      const filasDelMes = porMes.get(mesKey)!;
      meses.push({ mesKey, mesLabel: `${MESES[mes - 1]} ${anio}`, anio, mes, filas: filasDelMes, saldoAnteriorCant: saldoCant, saldoAnteriorUnit: saldoUnit, saldoAnteriorTotal: saldoTotal });
      const ultima = filasDelMes[filasDelMes.length - 1];
      saldoCant = ultima.saldo_cantidad;
      saldoUnit = ultima.saldo_costo_unit;
      saldoTotal = ultima.saldo_costo_total;
    }
    bloques.push({ codigo, nombre: filas[0]?.producto?.descripcion ?? codigo, unidadMedida: filas[0]?.producto?.unidad_medida ?? "NIU", meses });
  }
  return bloques;
}

export const KardexTable = forwardRef<KardexTableHandle, KardexTableProps>(
  function KardexTable({ movimientos, mostrarSemaforo = false, empresaImpresion }, ref) {
    const [pagina, setPagina] = useState(1);
    const firstErrorRef = useRef<HTMLTableRowElement | null>(null);
    const codigoTargetRef = useRef<HTMLTableRowElement | null>(null);
    const pendingScrollToAnomaly = useRef(false);
    const pendingScrollToCodigo = useRef<string | null>(null);
    const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
    const [imprimiendo, setImprimiendo] = useState(false);

    useEffect(() => {
      const onBefore = () => setImprimiendo(true);
      const onAfter = () => setImprimiendo(false);
      window.addEventListener("beforeprint", onBefore);
      window.addEventListener("afterprint", onAfter);
      return () => {
        window.removeEventListener("beforeprint", onBefore);
        window.removeEventListener("afterprint", onAfter);
      };
    }, []);

    const primerErrorIndex = useMemo(
      () => movimientos.findIndex((m) => m.error_a || m.error_b || m.saldo_negativo),
      [movimientos],
    );

    const findPrimerIndexCodigo = (codigo: string) =>
      movimientos.findIndex((m) => String(m.codigo).trim() === String(codigo).trim());

    useImperativeHandle(ref, () => ({
      scrollToFirstAnomaly: () => {
        if (primerErrorIndex === -1) return;
        const pg = Math.floor(primerErrorIndex / FILAS_POR_PAGINA) + 1;
        if (pagina === pg) { queueMicrotask(() => firstErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })); return; }
        pendingScrollToAnomaly.current = true;
        setPagina(pg);
      },
      scrollToCodigo: (codigo: string) => {
        const idx = findPrimerIndexCodigo(codigo);
        if (idx === -1) return;
        const pg = Math.floor(idx / FILAS_POR_PAGINA) + 1;
        pendingScrollToCodigo.current = codigo;
        if (pagina === pg) {
          queueMicrotask(() => { codigoTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); setHighlightIndex(idx); setTimeout(() => setHighlightIndex(null), 4000); });
        } else { setPagina(pg); }
      },
    }), [pagina, primerErrorIndex, movimientos]);

    useLayoutEffect(() => {
      if (!pendingScrollToAnomaly.current) return;
      if (primerErrorIndex === -1) { pendingScrollToAnomaly.current = false; return; }
      firstErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      pendingScrollToAnomaly.current = false;
    }, [pagina, primerErrorIndex]);

    useLayoutEffect(() => {
      if (!pendingScrollToCodigo.current) return;
      const codigo = pendingScrollToCodigo.current;
      const idx = findPrimerIndexCodigo(codigo);
      pendingScrollToCodigo.current = null;
      if (idx === -1) return;
      queueMicrotask(() => { codigoTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); setHighlightIndex(idx); setTimeout(() => setHighlightIndex(null), 4000); });
    }, [pagina]);

    const totalPaginas = Math.ceil(movimientos.length / FILAS_POR_PAGINA);
    const filas = useMemo(
      () => imprimiendo ? movimientos : movimientos.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA),
      [movimientos, pagina, imprimiendo],
    );
    const bloquesPrint = useMemo(() => agruparPorProductoMes(movimientos), [movimientos]);

    if (movimientos.length === 0)
      return (
        <div className="p-10 text-center font-mono text-xs text-muted-foreground/60 bg-card/10 rounded-xl border border-dashed">
          Sin movimientos registrados.
        </div>
      );

    return (
      <div className="w-full relative select-none font-mono">
        <style>{`
          @media screen { .kp-section { display:none !important; } }

          @media print {
            @page {
              size: A4 landscape;
              margin: 0;
            }

            /* Ocultar sidebar, header, footer y navegación */
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

            /* Quitar margen izquierdo del sidebar */
            [data-slot="sidebar-inset"],
            main,
            body > div,
            #root {
              margin-left: 0 !important;
              padding-left: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }

            body, html {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .ks-section { display: none !important; }
            .kp-section { display: block !important; }

            .kp-mes-block {
              page-break-inside: avoid;
              break-inside: avoid;
              margin-bottom: 8px;
              padding: 10mm 8mm 4mm 8mm;
              page-break-after: auto;
            }

            .kp-empresa { font-family: Arial, sans-serif; font-size: 8.5px; margin-bottom: 4px; }
            .kp-empresa-field { display: flex; align-items: baseline; gap: 4px; margin-bottom: 2px; }
            .kp-empresa-lbl { font-weight: 700; white-space: nowrap; min-width: 72px; }
            .kp-empresa-val { border-bottom: 1px solid #888; min-width: 200px; padding-bottom: 1px; }

            .kp-mes-titulo {
              font-family: Arial, sans-serif;
              font-size: 13px;
              font-weight: 900;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: .04em;
              margin: 8px 0 5px;
            }

            .kp-prod-info {
              width: 100%;
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              font-size: 8px;
              margin-bottom: 3px;
              border-top: 2px solid #222;
              border-bottom: 2px solid #222;
            }
            .kp-prod-info td { padding: 3px 6px; border: none; }
            .kp-prod-info .lbl { font-weight: 700; white-space: nowrap; }
            .kp-prod-info .val { font-weight: 600; padding-right: 16px; }

            .kp-mov-table {
              width: 100%;
              border-collapse: collapse;
              font-family: Arial, sans-serif;
              font-size: 7.5px;
            }
            .kp-mov-table th,
            .kp-mov-table th.th-grupo {
              background: white !important;
              color: black !important;
              border: 1px solid #333 !important;
              padding: 3px 4px !important;
              font-weight: 700 !important;
              font-size: 7px !important;
              text-transform: uppercase !important;
              text-align: center !important;
            }
            .kp-mov-table .th-grupo { border-bottom: 2px solid #333 !important; }
            .kp-mov-table td {
              border: 1px solid #ccc;
              padding: 2px 4px;
              color: black !important;
              background: white !important;
              white-space: nowrap;
            }
            .kp-mov-table .td-r { text-align: right; }
            .kp-mov-table .td-c { text-align: center; }
            .kp-mov-table .tr-saldo td { font-weight: 700 !important; font-style: italic !important; background: white !important; }
            .kp-mov-table .tr-alt td { background: white !important; }
            .kp-mov-table .tr-total td { font-weight: 700 !important; border-top: 2px solid #333 !important; background: white !important; }
          }
        `}</style>

        {/* ════ PANEL WEB ════ */}
        <div className="ks-section space-y-4">
          <div className="rounded-xl border bg-card/30 backdrop-blur-md text-card-foreground shadow-2xs overflow-x-auto border-border/50">
            <Table className="text-[11px] min-w-[1550px] table-fixed">
              <TableHeader className="bg-muted/20 text-xs border-b border-border/50">
                <TableRow className="hover:bg-transparent border-b border-border/40">
                  {mostrarSemaforo && <TableHead className="w-[50px] text-center text-muted-foreground font-bold">EST</TableHead>}
                  <TableHead className="w-[50px] text-center text-muted-foreground font-bold">#</TableHead>
                  <TableHead className="w-[90px] text-left text-muted-foreground font-bold">Cód.</TableHead>
                  <TableHead colSpan={4} className="text-center bg-blue-600/10 text-blue-400 font-bold border-r border-border/30">Comprobante Fiscal</TableHead>
                  <TableHead className="w-[140px] text-center bg-emerald-600/10 text-emerald-400 font-bold border-r border-border/30">Operación</TableHead>
                  <TableHead colSpan={3} className="text-center bg-teal-600/10 text-teal-400 font-bold border-r border-border/30">Entradas</TableHead>
                  <TableHead colSpan={3} className="text-center bg-rose-600/10 text-rose-400 font-bold border-r border-border/30">Salidas</TableHead>
                  <TableHead colSpan={3} className="text-center bg-sky-600/10 text-sky-400 font-bold">Saldo Final Acumulado</TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent bg-muted/10 text-[10px] uppercase tracking-wider text-muted-foreground/80 border-b border-border/30">
                  {mostrarSemaforo && <TableHead className="w-[50px]" />}
                  <TableHead className="w-[50px]" />
                  <TableHead className="w-[90px]" />
                  <TableHead className="w-[90px] py-2 text-center">Fecha</TableHead>
                  <TableHead className="w-[50px] py-2 text-center">Tipo</TableHead>
                  <TableHead className="w-[60px] py-2 text-center">Serie</TableHead>
                  <TableHead className="w-[140px] py-2 text-center border-r border-border/30">Número</TableHead>
                  <TableHead className="w-[140px] py-2 text-left border-r border-border/30">Tipo de Operación</TableHead>
                  <TableHead className="w-[80px] py-2 text-right">Cant</TableHead>
                  <TableHead className="w-[90px] py-2 text-right">C.Unit</TableHead>
                  <TableHead className="w-[100px] py-2 text-right border-r border-border/30">Total</TableHead>
                  <TableHead className="w-[80px] py-2 text-right">Cant</TableHead>
                  <TableHead className="w-[90px] py-2 text-right">C.Unit</TableHead>
                  <TableHead className="w-[100px] py-2 text-right border-r border-border/30">Total</TableHead>
                  <TableHead className="w-[80px] py-2 text-right">Cant</TableHead>
                  <TableHead className="w-[90px] py-2 text-right">C.Unit</TableHead>
                  <TableHead className="w-[100px] py-2 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TooltipProvider delayDuration={150}>
                  {filas.map((row, i) => {
                    if (row.es_saldo_inicial) {
                      return (
                        <TableRow key="saldo-inicial" className="bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 border-l-4 border-l-blue-500 transition-colors">
                          {mostrarSemaforo && <TableCell className="w-[50px] text-center font-bold text-muted-foreground/40">—</TableCell>}
                          <TableCell className="w-[50px] text-center font-bold text-blue-500 dark:text-blue-400">—</TableCell>
                          <TableCell className="w-[90px] font-semibold text-blue-600 dark:text-blue-400">{row.codigo}</TableCell>
                          <TableCell className="w-[90px] text-center text-blue-600 dark:text-blue-400 font-medium">{fmtFecha(row.fecha)}</TableCell>
                          <TableCell className="w-[50px] text-center text-muted-foreground/20">—</TableCell>
                          <TableCell className="w-[60px] text-center text-muted-foreground/20">—</TableCell>
                          <TableCell className="w-[140px] text-center text-muted-foreground/20 border-r border-border/30">—</TableCell>
                          <TableCell className="w-[140px] text-left text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wide border-r border-border/30">SALDO INICIAL</TableCell>
                          <TableCell className="w-[80px] text-muted-foreground/20">—</TableCell>
                          <TableCell className="w-[90px] text-muted-foreground/20">—</TableCell>
                          <TableCell className="w-[100px] text-muted-foreground/20 border-r border-border/30">—</TableCell>
                          <TableCell className="w-[80px] text-muted-foreground/20">—</TableCell>
                          <TableCell className="w-[90px] text-muted-foreground/20">—</TableCell>
                          <TableCell className="w-[100px] text-muted-foreground/20 border-r border-border/30">—</TableCell>
                          <TableCell className="w-[80px] text-right font-bold text-blue-600 dark:text-blue-400">{fmtCant(row.saldo_cantidad)}</TableCell>
                          <TableCell className="w-[90px] text-muted-foreground/20">—</TableCell>
                          <TableCell className="w-[100px] text-right font-bold text-blue-600 dark:text-blue-400">{fmtTotal(row.saldo_costo_total)}</TableCell>
                        </TableRow>
                      );
                    }
                    const globalIndex = (pagina - 1) * FILAS_POR_PAGINA + i;
                    const esError = globalIndex === primerErrorIndex;
                    const esHighlight = globalIndex === highlightIndex;
                    const semaforo = getSemaforo(row);
                    const tieneError = semaforo.badge !== "🟢";
                    const rowRef = esError ? firstErrorRef : esHighlight ? codigoTargetRef : null;
                    return (
                      <Tooltip key={row.id}>
                        <TooltipTrigger asChild>
                          <TableRow
                            ref={rowRef}
                            className={cn(
                              "transition-colors border-b border-border/40 text-muted-foreground",
                              esHighlight && "bg-blue-500/15 dark:bg-blue-500/20 hover:bg-blue-500/25 ring-2 ring-blue-500/40",
                              !esHighlight && esError && "bg-amber-500/10 dark:bg-amber-500/15 hover:bg-amber-500/20",
                              !esHighlight && !esError && tieneError && "bg-red-500/5 dark:bg-red-500/10 hover:bg-red-500/15",
                              !esHighlight && !esError && !tieneError && "hover:bg-muted/30 odd:bg-transparent even:bg-muted/5 dark:even:bg-muted/10",
                            )}
                          >
                            {mostrarSemaforo && <TableCell className="w-[50px] text-center text-sm">{semaforo.badge}</TableCell>}
                            <TableCell className="w-[50px] text-center font-mono text-muted-foreground/60 dark:text-muted-foreground/80">{row.fila}</TableCell>
                            <TableCell className="w-[90px] font-semibold text-blue-600 dark:text-blue-400">{row.codigo}</TableCell>
                            <TableCell className="w-[90px] text-center text-foreground/80 dark:text-muted-foreground">{fmtFecha(row.fecha)}</TableCell>
                            <TableCell className="w-[50px] text-center font-mono">{row.tipo_comprobante}</TableCell>
                            <TableCell className="w-[60px] text-center font-mono">{row.serie}</TableCell>
                            <TableCell className="w-[140px] text-center font-mono border-r border-border/30">{row.numero}</TableCell>
                            <TableCell className="w-[140px] text-left text-foreground/90 dark:text-foreground/90 font-medium truncate border-r border-border/30">{row.tipo_operacion}</TableCell>
                            <TableCell className="w-[80px] text-right font-mono text-foreground/90 dark:text-muted-foreground">{row.ent_cantidad > 0 ? fmtCant(row.ent_cantidad) : "—"}</TableCell>
                            <TableCell className="w-[90px] text-right font-mono text-muted-foreground/60 dark:text-muted-foreground/70">{row.ent_costo_unit > 0 ? fmtUnit(row.ent_costo_unit) : "—"}</TableCell>
                            <TableCell className="w-[100px] text-right font-mono text-foreground/90 dark:text-muted-foreground border-r border-border/30">{row.ent_costo_total > 0 ? fmtTotal(row.ent_costo_total) : "—"}</TableCell>
                            <TableCell className="w-[80px] text-right font-mono text-foreground/90 dark:text-muted-foreground">{row.sal_cantidad > 0 ? fmtCant(row.sal_cantidad) : "—"}</TableCell>
                            <TableCell className="w-[90px] text-right font-mono text-muted-foreground/60 dark:text-muted-foreground/70">{row.sal_costo_unit > 0 ? fmtUnit(row.sal_costo_unit) : "—"}</TableCell>
                            <TableCell className="w-[100px] text-right font-mono text-foreground/90 dark:text-muted-foreground border-r border-border/30">{row.sal_costo_total > 0 ? fmtTotal(row.sal_costo_total) : "—"}</TableCell>
                            <TableCell className={cn("w-[80px] text-right font-mono font-semibold", row.saldo_negativo ? "text-red-500 dark:text-red-400" : "text-blue-600 dark:text-sky-400")}>{fmtCant(row.saldo_cantidad)}</TableCell>
                            <TableCell className="w-[90px] text-right font-mono text-muted-foreground/60 dark:text-muted-foreground/70">{fmtUnit(row.saldo_costo_unit)}</TableCell>
                            <TableCell className={cn("w-[100px] text-right font-mono font-semibold", row.saldo_negativo ? "text-red-500 dark:text-red-400" : "text-blue-600 dark:text-sky-400")}>{fmtTotal(row.saldo_costo_total)}</TableCell>
                          </TableRow>
                        </TooltipTrigger>
                        {tieneError && (
                          <TooltipContent side="top" className="max-w-xs p-3 bg-zinc-950 dark:bg-zinc-900 border border-border text-white rounded-xl shadow-xl">
                            <div className="flex gap-2 items-start">
                              <span className="text-sm">{semaforo.badge}</span>
                              <div className="space-y-0.5">
                                <h5 className="font-bold text-xs text-zinc-100">{semaforo.text}</h5>
                                <p className="text-[11px] text-zinc-400 leading-normal">{getRowTooltipDescription(row)}</p>
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </TableBody>
            </Table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between py-2 border-t border-border/40 font-medium">
              <span className="text-xs text-muted-foreground font-mono">Página {pagina} de {totalPaginas}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={() => setPagina(1)} disabled={pagina === 1}><ChevronsLeft className="size-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={() => setPagina((p) => p - 1)} disabled={pagina === 1}><ChevronLeft className="size-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={() => setPagina((p) => p + 1)} disabled={pagina === totalPaginas}><ChevronRight className="size-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}><ChevronsRight className="size-4" /></Button>
              </div>
            </div>
          )}
        </div>

        {/* ════ IMPRESIÓN FISCAL SUNAT ════ */}
        {/* Renderizado vía Portal directo a document.body: así el bloque de
            impresión queda completamente fuera del contenedor `flex flex-col`
            de la página. Cuando vive anidado dentro de un layout flex, el
            motor de paginación de Chrome/Edge calcula mal los saltos de
            página tras los primeros 1-2 bloques marcados con
            page-break-inside: avoid, dejando el resto de páginas vacías o
            cortadas (justo el síntoma reportado: se detenía en Agosto). */}
        {createPortal(
        <div className="kp-section">
          {bloquesPrint.map((producto) => (
            <div key={producto.codigo}>
              {producto.meses.map((mes, mesIdx) => (
                <div key={mes.mesKey} className="kp-mes-block">
                  <div className="kp-empresa">
                    <div className="kp-empresa-field">
                      <span className="kp-empresa-lbl">Razón social:</span>
                      <span className="kp-empresa-val">{empresaImpresion?.razon_social ?? ""}</span>
                    </div>
                    <div className="kp-empresa-field">
                      <span className="kp-empresa-lbl">Ruc:</span>
                      <span className="kp-empresa-val">{empresaImpresion?.ruc ?? ""}</span>
                    </div>
                    <div className="kp-empresa-field">
                      <span className="kp-empresa-lbl">Dirección:</span>
                      <span className="kp-empresa-val">{empresaImpresion?.establecimiento ?? ""}</span>
                    </div>
                  </div>
                  <div className="kp-mes-titulo">INVENTARIO VALORIZADO DE {mes.mesLabel}</div>
                  <table className="kp-prod-info">
                    <tbody>
                      <tr>
                        <td className="lbl">Código:</td><td className="val">{producto.codigo}</td>
                        <td className="lbl">Nombre:</td><td className="val">{producto.nombre}</td>
                        <td className="lbl">Almacén:</td><td className="val">----------</td>
                        <td className="lbl">Tipo:</td><td className="val">{empresaImpresion?.tipo ?? "Mercadería"}</td>
                        <td className="lbl">Costo:</td><td className="val">{empresaImpresion?.metodo_valuacion ?? "Prom. Ponderado"}</td>
                      </tr>
                    </tbody>
                  </table>
                  <table className="kp-mov-table">
                    <thead>
                      <tr>
                        <th className="th-grupo" rowSpan={2} style={{ width: 20 }}>#</th>
                        <th className="th-grupo" rowSpan={2} style={{ width: 52 }}>FECHA</th>
                        <th className="th-grupo" colSpan={3}>COMPROBANTE</th>
                        <th className="th-grupo" rowSpan={2} style={{ width: 72 }}>TIPO OPERACIÓN</th>
                        <th className="th-grupo" colSpan={3}>ENTRADAS</th>
                        <th className="th-grupo" colSpan={3}>SALIDAS</th>
                        <th className="th-grupo" colSpan={3}>SALDO FINAL</th>
                      </tr>
                      <tr>
                        <th style={{ width: 22 }}>TIPO</th>
                        <th style={{ width: 32 }}>SERIE</th>
                        <th style={{ width: 50 }}>NÚMERO</th>
                        <th style={{ width: 38 }}>CANT</th>
                        <th style={{ width: 48 }}>C.U.</th>
                        <th style={{ width: 48 }}>TOTAL</th>
                        <th style={{ width: 38 }}>CANT</th>
                        <th style={{ width: 48 }}>C.U.</th>
                        <th style={{ width: 48 }}>TOTAL</th>
                        <th style={{ width: 38 }}>CANT</th>
                        <th style={{ width: 48 }}>C.U.</th>
                        <th style={{ width: 48 }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="tr-saldo">
                        <td className="td-c" colSpan={6}>
                          {mesIdx === 0 ? "▶ SALDO INICIAL" : `▶ SALDO ANTERIOR — ${producto.meses[mesIdx - 1].mesLabel}`}
                        </td>
                        <td className="td-r">—</td><td className="td-r">—</td><td className="td-r">—</td>
                        <td className="td-r">—</td><td className="td-r">—</td><td className="td-r">—</td>
                        <td className="td-r">{fmtCant(mes.saldoAnteriorCant)}</td>
                        <td className="td-r">{fmtUnit(mes.saldoAnteriorUnit)}</td>
                        <td className="td-r">{fmtTotal(mes.saldoAnteriorTotal)}</td>
                      </tr>
                      {mes.filas.map((row, ri) => (
                        <tr key={row.id} className={ri % 2 !== 0 ? "tr-alt" : ""}>
                          <td className="td-c">{ri + 1}</td>
                          <td>{fmtFecha(row.fecha)}</td>
                          <td className="td-c">{row.tipo_comprobante}</td>
                          <td>{row.serie}</td>
                          <td>{row.numero}</td>
                          <td>{row.tipo_operacion}</td>
                          <td className="td-r">{fmtCant(row.ent_cantidad)}</td>
                          <td className="td-r">{fmtUnit(row.ent_costo_unit)}</td>
                          <td className="td-r">{fmtTotal(row.ent_costo_total)}</td>
                          <td className="td-r">{fmtCant(row.sal_cantidad)}</td>
                          <td className="td-r">{fmtUnit(row.sal_costo_unit)}</td>
                          <td className="td-r">{fmtTotal(row.sal_costo_total)}</td>
                          <td className="td-r">{fmtCant(row.saldo_cantidad)}</td>
                          <td className="td-r">{fmtUnit(row.saldo_costo_unit)}</td>
                          <td className="td-r">{fmtTotal(row.saldo_costo_total)}</td>
                        </tr>
                      ))}
                      {(() => {
                        // OJO: el backend serializa los campos Decimal como STRING
                        // en el JSON (ej. "3.750"), no como número. Sumar con "+"
                        // directamente sobre esos valores hace concatenación de
                        // texto en vez de suma aritmética y termina en NaN al
                        // formatear. Por eso se fuerza Number(...) antes de sumar.
                        const totEntCant  = mes.filas.reduce((s, r) => s + (Number(r.ent_cantidad) || 0), 0);
                        const totEntTotal = mes.filas.reduce((s, r) => s + (Number(r.ent_costo_total) || 0), 0);
                        const totSalCant  = mes.filas.reduce((s, r) => s + (Number(r.sal_cantidad) || 0), 0);
                        const totSalTotal = mes.filas.reduce((s, r) => s + (Number(r.sal_costo_total) || 0), 0);
                        const ultima = mes.filas[mes.filas.length - 1];
                        return (
                          <tr className="tr-total">
                            <td colSpan={6} style={{ textAlign: "right", paddingRight: 6, fontSize: 6.5, textTransform: "uppercase" }}>TOTAL {mes.mesLabel}</td>
                            <td className="td-r">{fmtCant(totEntCant)}</td>
                            <td className="td-r">—</td>
                            <td className="td-r">{fmtTotal(totEntTotal)}</td>
                            <td className="td-r">{fmtCant(totSalCant)}</td>
                            <td className="td-r">—</td>
                            <td className="td-r">{fmtTotal(totSalTotal)}</td>
                            <td className="td-r">{fmtCant(ultima?.saldo_cantidad ?? 0)}</td>
                            <td className="td-r">{fmtUnit(ultima?.saldo_costo_unit ?? 0)}</td>
                            <td className="td-r">{fmtTotal(ultima?.saldo_costo_total ?? 0)}</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>,
        document.body,
        )}
      </div>
    );
  },
);

KardexTable.displayName = "KardexTable";
export default KardexTable;

interface MesBlock {
  mesKey: string;
  mesLabel: string;
  anio: number;
  mes: number;
  filas: KardexRow[];
  saldoAnteriorCant: number;
  saldoAnteriorUnit: number;
  saldoAnteriorTotal: number;
}
interface ProductoBlock {
  codigo: string;
  nombre: string;
  unidadMedida: string;
  meses: MesBlock[];
}