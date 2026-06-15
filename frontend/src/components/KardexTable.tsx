import {
  useState, useMemo, useRef, useLayoutEffect,
  useEffect, forwardRef, useImperativeHandle,
} from "react";
import type { KardexRow } from "../types";

export type KardexTableHandle = {
  scrollToFirstAnomaly: () => void;
  scrollToCodigo: (codigo: string) => void;
};

interface KardexTableProps {
  movimientos:      KardexRow[];
  mostrarSemaforo?: boolean;
  empresaImpresion?: {
    razon_social:     string
    ruc:              string
    establecimiento:  string
    tipo:             string
    metodo_valuacion: string
  } | null;
}

const fmtCant  = (n: number) => new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
const fmtUnit  = (n: number) => new Intl.NumberFormat("es-PE", { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(n);
const fmtTotal = (n: number) => new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
const fmtFecha = (fecha: string) => {
  try { return new Date(fecha + "T00:00:00").toLocaleDateString("es-PE"); }
  catch { return fecha; }
};

const MESES = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
               "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];

const FILAS_POR_PAGINA = 100;

type TooltipInfo = { emoji: string; title: string; description: string };

const getSemaforo = (row: KardexRow) => {
  if (row.saldo_negativo)         return "🔴";
  if (row.sin_saldo_inicial)      return "⚫";
  if (row.error_a && row.error_b) return "⚫";
  if (row.error_b)                return "🔴";
  if (row.error_a)                return "🟡";
  if (row.costo_reconstruido)     return "🟦";
  return "🟢";
};

const getRowTooltip = (row: KardexRow): TooltipInfo | null => {
  if (row.saldo_negativo)         return { emoji:"🔴", title:"Stock Negativo",         description:"Se registró una salida cuando el producto ya no tenía stock suficiente." };
  if (row.sin_saldo_inicial)      return { emoji:"⚫", title:"Sin Saldo Inicial",       description:"El producto no tiene saldo inicial registrado." };
  if (row.error_a && row.error_b) return { emoji:"⚫", title:"Inconsistencia Completa", description:"El Excel presenta inconsistencias internas y el cálculo del sistema difiere." };
  if (row.error_b)                return { emoji:"🔴", title:"Inconsistencia en Excel", description:"El Excel presenta diferencias matemáticas entre cantidad, costo unitario y total." };
  if (row.error_a)                return { emoji:"🟡", title:"Dato Recalculado",        description:"El valor original estaba vacío o incompleto; el sistema reconstruyó el costo." };
  if (row.costo_reconstruido)     return { emoji:"🟦", title:"Costo Reconstruido",      description:"El sistema completó el costo porque el Excel no traía un valor confiable." };
  return null;
};

/* ── Agrupación por producto → mes ── */
interface MesBlock {
  mesKey:             string
  mesLabel:           string
  anio:               number
  mes:                number
  filas:              KardexRow[]
  saldoAnteriorCant:  number
  saldoAnteriorUnit:  number
  saldoAnteriorTotal: number
}

interface ProductoBlock {
  codigo:       string
  nombre:       string
  unidadMedida: string
  meses:        MesBlock[]
}

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
    const saldoInicialRow = filas.find(f => f.es_saldo_inicial);
    const movRows         = filas.filter(f => !f.es_saldo_inicial);

    const porMes = new Map<string, KardexRow[]>();
    for (const f of movRows) {
      const key = getMesKey(f.fecha);
      if (!porMes.has(key)) porMes.set(key, []);
      porMes.get(key)!.push(f);
    }

    const mesesOrdenados = Array.from(porMes.keys()).sort();

    let saldoCant  = saldoInicialRow?.saldo_cantidad    ?? 0;
    let saldoUnit  = saldoInicialRow?.saldo_costo_unit  ?? 0;
    let saldoTotal = saldoInicialRow?.saldo_costo_total ?? 0;

    const meses: MesBlock[] = [];

    for (const mesKey of mesesOrdenados) {
      const [anioStr, mesStr] = mesKey.split("-");
      const anio = Number(anioStr);
      const mes  = Number(mesStr);
      const filasDelMes = porMes.get(mesKey)!;

      meses.push({
        mesKey,
        mesLabel: `${MESES[mes - 1]} ${anio}`,
        anio, mes,
        filas: filasDelMes,
        saldoAnteriorCant:  saldoCant,
        saldoAnteriorUnit:  saldoUnit,
        saldoAnteriorTotal: saldoTotal,
      });

      const ultima = filasDelMes[filasDelMes.length - 1];
      saldoCant  = ultima.saldo_cantidad;
      saldoUnit  = ultima.saldo_costo_unit;
      saldoTotal = ultima.saldo_costo_total;
    }

    bloques.push({
      codigo,
      nombre:       filas[0]?.producto?.descripcion   ?? codigo,
      unidadMedida: filas[0]?.producto?.unidad_medida ?? "NIU",
      meses,
    });
  }

  return bloques;
}

/* ── Componente ── */
const KardexTable = forwardRef<KardexTableHandle, KardexTableProps>(function KardexTable(
  { movimientos, mostrarSemaforo = false, empresaImpresion },
  ref
) {
  const [pagina, setPagina]                   = useState(1);
  const firstErrorRef                          = useRef<HTMLTableRowElement | null>(null);
  const codigoTargetRef                        = useRef<HTMLTableRowElement | null>(null);
  const pendingScrollToAnomaly                 = useRef(false);
  const pendingScrollToCodigo                  = useRef<string | null>(null);
  const [highlightIndex, setHighlightIndex]   = useState<number | null>(null);
  const [tooltip, setTooltip]                 = useState<(TooltipInfo & { left: number; top: number }) | null>(null);
  const [imprimiendo, setImprimiendo]         = useState(false);

  useEffect(() => {
    const onBefore = () => setImprimiendo(true);
    const onAfter  = () => setImprimiendo(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint",  onAfter);
    (window as any).__kardexPrepararImpresion = () => setImprimiendo(true);
    (window as any).__kardexTerminarImpresion = () => setImprimiendo(false);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint",  onAfter);
      delete (window as any).__kardexPrepararImpresion;
      delete (window as any).__kardexTerminarImpresion;
    };
  }, []);

  const primerErrorIndex = useMemo(
    () => movimientos.findIndex(m => m.error_a || m.error_b || m.saldo_negativo),
    [movimientos]
  );

  const findPrimerIndexCodigo = (codigo: string) =>
    movimientos.findIndex(m => String(m.codigo).trim() === String(codigo).trim());

  useImperativeHandle(ref, () => ({
    scrollToFirstAnomaly: () => {
      if (primerErrorIndex === -1) return;
      const pg = Math.floor(primerErrorIndex / FILAS_POR_PAGINA) + 1;
      if (pagina === pg) { queueMicrotask(() => firstErrorRef.current?.scrollIntoView({ behavior:"smooth", block:"center" })); return; }
      pendingScrollToAnomaly.current = true;
      setPagina(pg);
    },
    scrollToCodigo: (codigo: string) => {
      const idx = findPrimerIndexCodigo(codigo);
      if (idx === -1) return;
      const pg = Math.floor(idx / FILAS_POR_PAGINA) + 1;
      pendingScrollToCodigo.current = codigo;
      if (pagina === pg) {
        queueMicrotask(() => {
          codigoTargetRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
          setHighlightIndex(idx);
          setTimeout(() => setHighlightIndex(null), 4000);
        });
      } else { setPagina(pg); }
    },
  }), [pagina, primerErrorIndex, movimientos]);

  useLayoutEffect(() => {
    if (!pendingScrollToAnomaly.current) return;
    if (primerErrorIndex === -1) { pendingScrollToAnomaly.current = false; return; }
    firstErrorRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
    pendingScrollToAnomaly.current = false;
  }, [pagina, primerErrorIndex]);

  useLayoutEffect(() => {
    if (!pendingScrollToCodigo.current) return;
    const codigo = pendingScrollToCodigo.current;
    const idx = findPrimerIndexCodigo(codigo);
    pendingScrollToCodigo.current = null;
    if (idx === -1) return;
    queueMicrotask(() => {
      codigoTargetRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
      setHighlightIndex(idx);
      setTimeout(() => setHighlightIndex(null), 4000);
    });
  }, [pagina]);

  useEffect(() => {
    (window as any).__kardexIrAFila = (codigo: string) => {
      const idx = findPrimerIndexCodigo(codigo);
      if (idx === -1) return;
      const pg = Math.floor(idx / FILAS_POR_PAGINA) + 1;
      pendingScrollToCodigo.current = codigo;
      if (pagina === pg) {
        queueMicrotask(() => {
          codigoTargetRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
          setHighlightIndex(idx);
          setTimeout(() => setHighlightIndex(null), 4000);
        });
      } else { setPagina(pg); }
    };
    return () => { delete (window as any).__kardexIrAFila; };
  }, [movimientos, pagina]);

  const totalPaginas = Math.ceil(movimientos.length / FILAS_POR_PAGINA);
  const filas = useMemo(
    () => imprimiendo ? movimientos : movimientos.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA),
    [movimientos, pagina, imprimiendo]
  );

  const bloquesPrint = useMemo(() => agruparPorProductoMes(movimientos), [movimientos]);

  if (movimientos.length === 0)
    return <div style={{ padding:40, textAlign:"center", color:"#2a5080" }}>Sin datos</div>;

  return (
    <div style={{ position:"relative", fontFamily:"'JetBrains Mono', monospace" }}>

      {tooltip && (
        <div className="kardex-tooltip" style={{ left:tooltip.left, top:tooltip.top }}>
          <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>{tooltip.emoji} {tooltip.title}</div>
          <div style={{ fontSize:11, color:"#c8d6e5", lineHeight:1.45 }}>{tooltip.description}</div>
        </div>
      )}

      <style>{`
        .kardex-tooltip {
          position:fixed; z-index:9999; max-width:320px;
          background:rgba(10,18,32,0.95); color:#f8fafc;
          border:1px solid rgba(96,165,250,0.16);
          box-shadow:0 18px 40px rgba(0,0,0,0.35);
          border-radius:12px; padding:12px 14px;
          pointer-events:none; white-space:normal;
        }

        /* ── Ocultar sección print en pantalla ── */
        @media screen { .kp-section { display:none !important; } }

        /* ── Ocultar tabla pantalla al imprimir ── */
        @media print {
          .ks-section             { display:none !important; }
          .kardex-pagination-bar  { display:none !important; }
          .kardex-tooltip         { display:none !important; }
          .kp-section             { display:block !important; }

          @page { size: A4 landscape; margin: 10mm 8mm; }

          body, html { background:white !important; color:black !important; }

          /* ── Bloque por mes: nunca cortar internamente ── */
          .kp-mes-block {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 20px;
          }

          /* ════ ENCABEZADO OPCIÓN B — LIBROS CONTABLES CLÁSICOS ════ */

          /* Bloque empresa: 3 filas apiladas (Razón social / RUC / Dirección) */
          .kp-empresa {
            font-family: Arial, sans-serif;
            font-size: 8.5px;
            margin-bottom: 4px;
          }
          .kp-empresa-field {
            display: flex;
            align-items: baseline;
            gap: 4px;
            margin-bottom: 2px;
          }
          .kp-empresa-lbl {
            font-weight: 700;
            white-space: nowrap;
            min-width: 72px;   /* alinea los valores */
          }
          .kp-empresa-val {
            border-bottom: 1px solid #888;
            min-width: 200px;
            padding-bottom: 1px;
          }

          /* Título del mes — centrado, negrita, mayúsculas, tamaño grande */
          .kp-mes-titulo {
            font-family: Arial, sans-serif;
            font-size: 13px;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: .04em;
            margin: 8px 0 5px;
          }

          /* Info del producto — fila única con borde doble inferior */
          .kp-prod-info {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            font-size: 8px;
            margin-bottom: 3px;
            border-top: 2px solid #222;
            border-bottom: 2px solid #222;
          }
          .kp-prod-info td {
            padding: 3px 6px;
            border: none;
          }
          .kp-prod-info .lbl {
            font-weight: 700;
            white-space: nowrap;
          }
          .kp-prod-info .val {
            font-weight: 600;
            padding-right: 16px;
          }

          /* Tabla movimientos — BLANCO Y NEGRO PURO */
          .kp-mov-table {
            width: 100%;
            border-collapse: collapse;
            font-family: Arial, sans-serif;
            font-size: 7.5px;
          }

          /* Anular TODOS los colores de th (incluyendo los inline style) */
          .kp-mov-table th,
          .kp-mov-table th.th-grupo {
            background: white !important;
            background-color: white !important;
            color: black !important;
            border: 1px solid #333 !important;
            padding: 3px 4px !important;
            font-weight: 700 !important;
            font-size: 7px !important;
            text-transform: uppercase !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Fila de grupo superior — negrita con borde inferior más grueso */
          .kp-mov-table .th-grupo {
            border-bottom: 2px solid #333 !important;
          }

          .kp-mov-table td {
            border: 1px solid #ccc;
            padding: 2px 4px;
            color: black !important;
            background: white !important;
            white-space: nowrap;
          }
          .kp-mov-table .td-r  { text-align: right; }
          .kp-mov-table .td-c  { text-align: center; }

          /* Saldo anterior — fondo blanco, solo negrita+cursiva */
          .kp-mov-table .tr-saldo {
            background: white !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .kp-mov-table .tr-saldo td {
            font-weight: 700 !important;
            font-style: italic !important;
            background: white !important;
          }

          /* Filas alternas — blanco puro */
          .kp-mov-table .tr-alt {
            background: white !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .kp-mov-table .tr-alt td { background: white !important; }

          /* Fila total — blanco con borde superior doble */
          .kp-mov-table .tr-total {
            background: white !important;
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .kp-mov-table .tr-total td {
            font-weight: 700 !important;
            border-top: 2px solid #333 !important;
            background: white !important;
          }
        }
      `}</style>

      {/* ════ TABLA PANTALLA ════ */}
      <div className="ks-section">
        <div style={{ overflowX:"auto" }}>
          <table className="kardex-tbl-print" style={{ borderCollapse:"separate", borderSpacing:0, fontSize:11, tableLayout:"fixed", minWidth:1200 }}>
            <thead>
              <tr>
                {mostrarSemaforo && <th style={thDark} />}
                <th className="col-grp-num" style={thDark} />
                <th className="col-grp-cod" style={thDark} />
                <th colSpan={4} style={{ ...thGrupo, background:"#185FA5" }}>Comprobante</th>
                <th style={{ ...thGrupo, background:"#0F6E56" }}>Tipo operación</th>
                <th colSpan={3} style={{ ...thGrupo, background:"#0B5E3A" }}>Entradas</th>
                <th colSpan={3} style={{ ...thGrupo, background:"#7A2020" }}>Salidas</th>
                <th colSpan={3} style={{ ...thGrupo, background:"#1A3A5C" }}>Saldo final</th>
              </tr>
              <tr style={{ background:"#0a1929" }}>
                {mostrarSemaforo && <th style={thSub}>Est</th>}
                <th className="col-num" style={thSub}>#</th>
                <th className="col-cod" style={thSub}>Cód.</th>
                <th style={thSub}>Fecha</th>
                <th style={thSub}>Tipo</th>
                <th style={thSub}>Serie</th>
                <th style={thSub}>Número</th>
                <th style={thSub}>Operación</th>
                <th style={thSub}>Cant</th>
                <th style={thSub}>C.Unit</th>
                <th style={thSub}>Total</th>
                <th style={thSub}>Cant</th>
                <th style={thSub}>C.Unit</th>
                <th style={thSub}>Total</th>
                <th style={thSub}>Cant</th>
                <th style={thSub}>C.Unit</th>
                <th style={thSub}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((row, i) => {
                if (row.es_saldo_inicial) {
                  return (
                    <tr key="saldo-inicial" style={{ background:"rgba(59,130,246,0.10)", borderLeft:"3px solid #3b82f6" }}>
                      {mostrarSemaforo && <td style={td}>—</td>}
                      <td className="col-num" style={{ ...td, color:"#60a5fa", fontWeight:700 }}>—</td>
                      <td className="col-cod" style={{ ...td, color:"#378ADD", fontWeight:600 }}>{row.codigo}</td>
                      <td style={{ ...td, color:"#60a5fa" }}>{fmtFecha(row.fecha)}</td>
                      <td style={td}>—</td><td style={td}>—</td><td style={td}>—</td>
                      <td style={{ ...td, color:"#60a5fa", fontWeight:700 }}>SALDO INICIAL</td>
                      <td style={td}>—</td><td style={td}>—</td><td style={td}>—</td>
                      <td style={td}>—</td><td style={td}>—</td><td style={td}>—</td>
                      <td style={{ ...td, fontWeight:700, color:"#60a5fa" }}>{fmtCant(row.saldo_cantidad)}</td>
                      <td style={td}>—</td>
                      <td style={{ ...td, fontWeight:700, color:"#60a5fa" }}>{fmtTotal(row.saldo_costo_total)}</td>
                    </tr>
                  );
                }

                const globalIndex = (pagina - 1) * FILAS_POR_PAGINA + i;
                const esError     = globalIndex === primerErrorIndex;
                const esHighlight = globalIndex === highlightIndex;
                const semaforo    = getSemaforo(row);
                const tieneError  = semaforo !== "🟢";
                const bgBase      = esHighlight ? "rgba(96,165,250,0.22)"
                                  : esError     ? "rgba(245,158,11,0.15)"
                                  : tieneError  ? "rgba(226,75,74,0.06)"
                                  : i % 2 === 0 ? "transparent"
                                  : "rgba(55,138,221,0.03)";
                const rowRef = esError ? firstErrorRef : (esHighlight ? codigoTargetRef : null);

                return (
                  <tr key={row.id} ref={rowRef}
                    onMouseEnter={e => {
                      if (!esHighlight) e.currentTarget.style.background = "rgba(56,139,221,0.09)";
                      const info = getRowTooltip(row);
                      if (!info) { setTooltip(null); return; }
                      const r = e.currentTarget.getBoundingClientRect();
                      setTooltip({ ...info, left:Math.max(r.left+12,12), top:r.top+r.height+6 });
                    }}
                    onMouseLeave={e => { e.currentTarget.style.background = bgBase; setTooltip(null); }}
                    style={{ background:bgBase, transition:"background .3s", boxShadow:esHighlight?"inset 0 0 0 2px rgba(96,165,250,0.55)":"none" }}
                  >
                    {mostrarSemaforo && <td style={td}>{semaforo}</td>}
                    <td className="col-num" style={td}>{row.fila}</td>
                    <td className="col-cod" style={{ ...td, color:"#378ADD", fontWeight:600 }}>{row.codigo}</td>
                    <td style={td}>{fmtFecha(row.fecha)}</td>
                    <td style={td}>{row.tipo_comprobante}</td>
                    <td style={td}>{row.serie}</td>
                    <td style={td}>{row.numero}</td>
                    <td style={td}>{row.tipo_operacion}</td>
                    <td style={td}>{fmtCant(row.ent_cantidad)}</td>
                    <td style={td}>{fmtUnit(row.ent_costo_unit)}</td>
                    <td style={td}>{fmtTotal(row.ent_costo_total)}</td>
                    <td style={td}>{fmtCant(row.sal_cantidad)}</td>
                    <td style={td}>{fmtUnit(row.sal_costo_unit)}</td>
                    <td style={td}>{fmtTotal(row.sal_costo_total)}</td>
                    <td style={{ ...td, fontWeight:600, color:row.saldo_negativo?"#f87171":"#85b7eb" }}>{fmtCant(row.saldo_cantidad)}</td>
                    <td style={td}>{fmtUnit(row.saldo_costo_unit)}</td>
                    <td style={{ ...td, fontWeight:600, color:row.saldo_negativo?"#f87171":"#85b7eb" }}>{fmtTotal(row.saldo_costo_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="kardex-pagination-bar" style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderTop:"1px solid rgba(55,138,221,0.08)" }}>
            <span style={{ fontSize:10, color:"#2a5080" }}>Página {pagina} de {totalPaginas}</span>
            <div style={{ display:"flex", gap:4 }}>
              <PagBtn onClick={() => setPagina(1)}            disabled={pagina===1}>«</PagBtn>
              <PagBtn onClick={() => setPagina(p=>p-1)}       disabled={pagina===1}>‹</PagBtn>
              <PagBtn onClick={() => setPagina(p=>p+1)}       disabled={pagina===totalPaginas}>›</PagBtn>
              <PagBtn onClick={() => setPagina(totalPaginas)} disabled={pagina===totalPaginas}>»</PagBtn>
            </div>
          </div>
        )}
      </div>

      {/* ════ SECCIÓN IMPRESIÓN ════ */}
      <div className="kp-section">
        {bloquesPrint.map((producto) => (
          <div key={producto.codigo}>
            {producto.meses.map((mes, mesIdx) => (
              <div key={mes.mesKey} className="kp-mes-block">

                {/* ══ ENCABEZADO OPCIÓN B: empresa en columna + título centrado ══ */}
                <div className="kp-empresa">
                  <div className="kp-empresa-field">
                    <span className="kp-empresa-lbl">Razón social:</span>
                    <span className="kp-empresa-val">{empresaImpresion?.razon_social ?? ''}</span>
                  </div>
                  <div className="kp-empresa-field">
                    <span className="kp-empresa-lbl">Ruc:</span>
                    <span className="kp-empresa-val">{empresaImpresion?.ruc ?? ''}</span>
                  </div>
                  <div className="kp-empresa-field">
                    <span className="kp-empresa-lbl">Dirección:</span>
                    <span className="kp-empresa-val">{empresaImpresion?.establecimiento ?? ''}</span>
                  </div>
                </div>

                {/* Título del mes — grande, negrita, centrado */}
                <div className="kp-mes-titulo">
                  INVENTARIO VALORIZADO DE {mes.mesLabel}
                </div>

                {/* Info del producto — fila única separada con líneas dobles */}
                <table className="kp-prod-info">
                  <tbody>
                    <tr>
                      <td className="lbl">Código:</td>
                      <td className="val">{producto.codigo}</td>
                      <td className="lbl">Nombre:</td>
                      <td className="val">{producto.nombre}</td>
                      <td className="lbl">Almacén:</td>
                      <td className="val">----------</td>
                      <td className="lbl">Tipo:</td>
                      <td className="val">{empresaImpresion?.tipo ?? 'Mercadería'}</td>
                      <td className="lbl">Costo:</td>
                      <td className="val">{empresaImpresion?.metodo_valuacion ?? 'Prom. Ponderado'}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabla movimientos */}
                <table className="kp-mov-table">
                  <thead>
                    <tr>
                      <th className="th-grupo" rowSpan={2} style={{ width:20 }}>#</th>
                      <th className="th-grupo" rowSpan={2} style={{ width:52 }}>FECHA</th>
                      <th className="th-grupo" colSpan={3}>COMPROBANTE</th>
                      <th className="th-grupo" rowSpan={2} style={{ width:72 }}>TIPO OPERACIÓN</th>
                      <th className="th-grupo" colSpan={3}>ENTRADAS</th>
                      <th className="th-grupo" colSpan={3}>SALIDAS</th>
                      <th className="th-grupo" colSpan={3}>SALDO FINAL</th>
                    </tr>
                    <tr>
                      <th style={{ width:22 }}>TIPO</th>
                      <th style={{ width:32 }}>SERIE</th>
                      <th style={{ width:50 }}>NÚMERO</th>
                      <th style={{ width:38 }}>CANT</th>
                      <th style={{ width:48 }}>C.U.</th>
                      <th style={{ width:48 }}>TOTAL</th>
                      <th style={{ width:38 }}>CANT</th>
                      <th style={{ width:48 }}>C.U.</th>
                      <th style={{ width:48 }}>TOTAL</th>
                      <th style={{ width:38 }}>CANT</th>
                      <th style={{ width:48 }}>C.U.</th>
                      <th style={{ width:48 }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Fila saldo anterior / inicial */}
                    <tr className="tr-saldo">
                      <td className="td-c" colSpan={6}>
                        {mesIdx === 0
                          ? '▶ SALDO INICIAL'
                          : `▶ SALDO ANTERIOR — ${producto.meses[mesIdx - 1].mesLabel}`}
                      </td>
                      <td className="td-r">—</td><td className="td-r">—</td><td className="td-r">—</td>
                      <td className="td-r">—</td><td className="td-r">—</td><td className="td-r">—</td>
                      <td className="td-r">{fmtCant(mes.saldoAnteriorCant)}</td>
                      <td className="td-r">{fmtUnit(mes.saldoAnteriorUnit)}</td>
                      <td className="td-r">{fmtTotal(mes.saldoAnteriorTotal)}</td>
                    </tr>

                    {/* Movimientos del mes */}
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

                    {/* Totales del mes */}
                    {(() => {
                      const totEntCant  = mes.filas.reduce((s,r) => s + (r.ent_cantidad    || 0), 0);
                      const totEntTotal = mes.filas.reduce((s,r) => s + (r.ent_costo_total || 0), 0);
                      const totSalCant  = mes.filas.reduce((s,r) => s + (r.sal_cantidad    || 0), 0);
                      const totSalTotal = mes.filas.reduce((s,r) => s + (r.sal_costo_total || 0), 0);
                      const ultima      = mes.filas[mes.filas.length - 1];
                      return (
                        <tr className="tr-total">
                          <td colSpan={6} style={{ textAlign:"right", paddingRight:6, fontSize:6.5, textTransform:"uppercase" }}>
                            TOTAL {mes.mesLabel}
                          </td>
                          <td className="td-r">{fmtCant(totEntCant)}</td>
                          <td className="td-r">—</td>
                          <td className="td-r">{fmtTotal(totEntTotal)}</td>
                          <td className="td-r">{fmtCant(totSalCant)}</td>
                          <td className="td-r">—</td>
                          <td className="td-r">{fmtTotal(totSalTotal)}</td>
                          <td className="td-r">{fmtCant(ultima?.saldo_cantidad    ?? 0)}</td>
                          <td className="td-r">{fmtUnit(ultima?.saldo_costo_unit  ?? 0)}</td>
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
      </div>
    </div>
  );
});

export default KardexTable;

const thDark:  React.CSSProperties = { background:"#0b1a2c" };
const thGrupo: React.CSSProperties = {
  padding:"7px 10px", textTransform:"uppercase", fontSize:9,
  letterSpacing:".12em", fontWeight:700,
  color:"rgba(255,255,255,0.88)", fontFamily:"'IBM Plex Mono', monospace",
};
const thSub: React.CSSProperties = {
  padding:"6px 10px", fontSize:9, fontWeight:600, letterSpacing:".06em",
  color:"#4a7a9a", background:"#0a1929",
  borderBottom:"1px solid rgba(56,139,221,0.14)",
};
const td: React.CSSProperties = {
  padding:"9px 10px", color:"#6a8ab0",
  borderBottom:"1px solid rgba(55,138,221,0.04)",
};

function PagBtn({ onClick, disabled, children }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"4px 10px", borderRadius:6,
      background: disabled ? "rgba(56,139,221,0.05)" : "rgba(56,139,221,0.15)",
      color:      disabled ? "#2a4a6a" : "#60a5fa",
      border:"1px solid "+(disabled ? "rgba(56,139,221,0.08)" : "rgba(56,139,221,0.28)"),
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize:12, fontFamily:"'IBM Plex Mono', monospace",
    }}>
      {children}
    </button>
  );
}