import {
  useState,
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { KardexRow } from "../types";

export type KardexTableHandle = {
  scrollToFirstAnomaly: () => void;
  scrollToCodigo: (codigo: string) => void;
};

interface KardexTableProps {
  movimientos: KardexRow[];
  mostrarSemaforo?: boolean;
}

const fmtCant = (n: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtUnit = (n: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 5, maximumFractionDigits: 5 }).format(n);

const fmtTotal = (n: number) =>
  new Intl.NumberFormat("es-PE", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

const fmtFecha = (fecha: string) => {
  try {
    return new Date(fecha + "T00:00:00").toLocaleDateString("es-PE");
  } catch {
    return fecha;
  }
};

const FILAS_POR_PAGINA = 100;

type TooltipInfo = {
  emoji: string;
  title: string;
  description: string;
};

const getSemaforo = (row: KardexRow) => {
  if (row.saldo_negativo) return "🔴";
  if (row.sin_saldo_inicial) return "⚫";
  if (row.error_a && row.error_b) return "⚫";
  if (row.error_b) return "🔴";
  if (row.error_a) return "🟡";
  return "🟢";
};

const getRowTooltip = (row: KardexRow): TooltipInfo | null => {
  if (row.saldo_negativo) return { emoji: "🔴", title: "Stock Negativo", description: "Se registró una salida cuando el producto ya no tenía stock suficiente. Revisar compras, devoluciones o movimientos faltantes." };
  if (row.sin_saldo_inicial) return { emoji: "⚫", title: "Sin Saldo Inicial", description: "El producto no tiene saldo inicial registrado." };
  if (row.error_a && row.error_b) return { emoji: "⚫", title: "Inconsistencia Completa", description: "El Excel original presenta inconsistencias y además el cálculo recalculado difiere del sistema." };
  if (row.error_b) return { emoji: "🔴", title: "Inconsistencia en Excel", description: "El Excel original presenta diferencias matemáticas entre cantidad, costo unitario y costo total." };
  if (row.error_a) return { emoji: "🟡", title: "Diferencia de Cálculo", description: "El sistema recalculó valores diferentes a los registrados en el Excel original." };
  return null;
};

const KardexTable = forwardRef<KardexTableHandle, KardexTableProps>(function KardexTable(
  { movimientos, mostrarSemaforo = false },
  ref
) {
  const [pagina, setPagina] = useState(1);
  const firstErrorRef = useRef<HTMLTableRowElement | null>(null);
  const codigoTargetRef = useRef<HTMLTableRowElement | null>(null);
  const pendingScrollToAnomaly = useRef(false);
  const pendingScrollToCodigo = useRef<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<(TooltipInfo & { left: number; top: number }) | null>(null);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    const handleBeforePrint = () => setImprimiendo(true);
    const handleAfterPrint  = () => setImprimiendo(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    (window as any).__kardexPrepararImpresion = () => { setImprimiendo(true); };
    (window as any).__kardexTerminarImpresion = () => { setImprimiendo(false); };
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      delete (window as any).__kardexPrepararImpresion;
      delete (window as any).__kardexTerminarImpresion;
    };
  }, []);

  const primerErrorIndex = useMemo(() => {
    return movimientos.findIndex((m) => m.error_a || m.error_b || m.saldo_negativo);
  }, [movimientos]);

  const findPrimerIndexCodigo = (codigo: string) => {
    return movimientos.findIndex(m => String(m.codigo).trim() === String(codigo).trim());
  };

  useImperativeHandle(ref, () => ({
    scrollToFirstAnomaly: () => {
      if (primerErrorIndex === -1) return;
      const paginaError = Math.floor(primerErrorIndex / FILAS_POR_PAGINA) + 1;
      if (pagina === paginaError) {
        queueMicrotask(() => { firstErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); });
        return;
      }
      pendingScrollToAnomaly.current = true;
      setPagina(paginaError);
    },
    scrollToCodigo: (codigo: string) => {
      const idx = findPrimerIndexCodigo(codigo);
      if (idx === -1) return;
      const paginaTarget = Math.floor(idx / FILAS_POR_PAGINA) + 1;
      pendingScrollToCodigo.current = codigo;
      if (pagina === paginaTarget) {
        queueMicrotask(() => {
          codigoTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightIndex(idx);
          setTimeout(() => setHighlightIndex(null), 4000);
        });
      } else {
        setPagina(paginaTarget);
      }
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
    queueMicrotask(() => {
      codigoTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightIndex(idx);
      setTimeout(() => setHighlightIndex(null), 4000);
    });
  }, [pagina]);

  useEffect(() => {
    (window as any).__kardexIrAFila = (codigo: string) => {
      const idx = findPrimerIndexCodigo(codigo);
      if (idx === -1) return;
      const paginaTarget = Math.floor(idx / FILAS_POR_PAGINA) + 1;
      pendingScrollToCodigo.current = codigo;
      if (pagina === paginaTarget) {
        queueMicrotask(() => {
          codigoTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightIndex(idx);
          setTimeout(() => setHighlightIndex(null), 4000);
        });
      } else {
        setPagina(paginaTarget);
      }
    };
    return () => { delete (window as any).__kardexIrAFila; };
  }, [movimientos, pagina]);

  const totalPaginas = Math.ceil(movimientos.length / FILAS_POR_PAGINA);

  const filas = useMemo(() => {
    if (imprimiendo) return movimientos;
    return movimientos.slice((pagina - 1) * FILAS_POR_PAGINA, pagina * FILAS_POR_PAGINA);
  }, [movimientos, pagina, imprimiendo]);

  if (movimientos.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: "#2a5080" }}>Sin datos</div>;
  }

  return (
    <div style={{ position: 'relative', fontFamily: "'JetBrains Mono', monospace" }}>

      {tooltip && (
        <div className="kardex-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{tooltip.emoji} {tooltip.title}</div>
          <div style={{ fontSize: 11, color: '#c8d6e5', lineHeight: 1.45, whiteSpace: 'normal' }}>{tooltip.description}</div>
        </div>
      )}

      <style>{`
        @media print {
          .kardex-tbl-print {
            font-size: 8px !important;
            table-layout: auto !important;
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
          }
          .kardex-tbl-print th,
          .kardex-tbl-print td {
            padding: 2px 3px !important;
            font-size: 8px !important;
            white-space: nowrap !important;
            border: 1px solid #bbb !important;
          }
          .kardex-tbl-print th {
            background: #e8e8e8 !important;
            color: black !important;
            font-weight: 700 !important;
          }
          .kardex-tbl-print td {
            color: black !important;
          }
          /* Solo ocultar # y Cód. — Entradas y Salidas SÍ se muestran */
          .col-num, .col-cod,
          .col-grp-num, .col-grp-cod {
            display: none !important;
          }
          .kardex-pagination-bar { display: none !important; }
          .kardex-tbl-print thead { display: table-header-group !important; }
          .kardex-tbl-print tr { page-break-inside: avoid !important; }
        }
        .kardex-tooltip {
          position: fixed;
          z-index: 9999;
          max-width: 320px;
          background: rgba(10,18,32,0.95);
          color: #f8fafc;
          border: 1px solid rgba(96,165,250,0.16);
          box-shadow: 0 18px 40px rgba(0,0,0,0.35);
          border-radius: 12px;
          padding: 12px 14px;
          pointer-events: none;
          white-space: normal;
        }
      `}</style>

      <div style={{ overflowX: "auto" }}>
        <table className="kardex-tbl-print" style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: 11,
          tableLayout: "fixed",
          minWidth: 1200
        }}>
          <thead>
            <tr>
              {mostrarSemaforo && <th style={thDark}></th>}
              {/* ocultar en print */}
              <th className="col-grp-num" style={thDark}></th>
              <th className="col-grp-cod" style={thDark}></th>

              <th colSpan={4} style={{ ...thGrupo, background: "#185FA5" }}>Comprobante</th>
              <th style={{ ...thGrupo, background: "#0F6E56" }}>Tipo operación</th>
              <th colSpan={3} style={{ ...thGrupo, background: "#0B5E3A" }}>Entradas</th>
              <th colSpan={3} style={{ ...thGrupo, background: "#7A2020" }}>Salidas</th>
              <th colSpan={3} style={{ ...thGrupo, background: "#1A3A5C" }}>Saldo final</th>
            </tr>
            <tr style={{ background: "#0a1929" }}>
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
                  <tr key="saldo-inicial" style={{ background: "rgba(59,130,246,0.10)", borderLeft: "3px solid #3b82f6" }}>
                    {mostrarSemaforo && <td style={td}>—</td>}
                    <td className="col-num" style={{ ...td, color: "#60a5fa", fontWeight: 700 }}>—</td>
                    <td className="col-cod" style={{ ...td, color: "#378ADD", fontWeight: 600 }}>{row.codigo}</td>
                    <td style={{ ...td, color: "#60a5fa" }}>{fmtFecha(row.fecha)}</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={{ ...td, color: "#60a5fa", fontWeight: 700, letterSpacing: ".05em" }}>SALDO INICIAL</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={td}>—</td>
                    <td style={{ ...td, fontWeight: 700, color: "#60a5fa" }}>{fmtCant(row.saldo_cantidad)}</td>
                    <td style={td}>—</td>
                    <td style={{ ...td, fontWeight: 700, color: "#60a5fa" }}>{fmtTotal(row.saldo_costo_total)}</td>
                  </tr>
                );
              }

              const globalIndex = imprimiendo ? i : (pagina - 1) * FILAS_POR_PAGINA + i;
              const esError = globalIndex === primerErrorIndex;
              const esHighlight = globalIndex === highlightIndex;
              const semaforo = getSemaforo(row);
              const tieneError = semaforo !== "🟢";

              const bgBase = esHighlight
                ? "rgba(96,165,250,0.22)"
                : esError ? "rgba(245,158,11,0.15)"
                : tieneError ? "rgba(226,75,74,0.06)"
                : i % 2 === 0 ? "transparent"
                : "rgba(55,138,221,0.03)";

              const isCodigoTarget = pendingScrollToCodigo.current === null && highlightIndex === globalIndex;
              const rowRef = esError ? firstErrorRef : isCodigoTarget ? codigoTargetRef : null;

              return (
                <tr
                  key={row.id}
                  ref={rowRef}
                  onMouseEnter={e => {
                    if (!esHighlight) e.currentTarget.style.background = "rgba(56,139,221,0.09)";
                    const info = getRowTooltip(row);
                    if (!info) { setTooltip(null); return; }
                    const rowRect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ ...info, left: Math.max(rowRect.left + 12, 12), top: rowRect.top + rowRect.height + 6 });
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = bgBase;
                    setTooltip(null);
                  }}
                  style={{ background: bgBase, transition: "background .3s", boxShadow: esHighlight ? "inset 0 0 0 2px rgba(96,165,250,0.55)" : "none" }}
                >
                  {mostrarSemaforo && <td style={td}>{semaforo}</td>}
                  <td className="col-num" style={td}>{row.fila}</td>
                  <td className="col-cod" style={{ ...td, color: "#378ADD", fontWeight: 600 }}>{row.codigo}</td>

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

                  <td style={{ ...td, fontWeight: 600, color: "#85b7eb" }}>{fmtCant(row.saldo_cantidad)}</td>
                  <td style={td}>{fmtUnit(row.saldo_costo_unit)}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#85b7eb" }}>{fmtTotal(row.saldo_costo_total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="kardex-pagination-bar" style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid rgba(55,138,221,0.08)" }}>
          <span style={{ fontSize: 10, color: "#2a5080" }}>Página {pagina} de {totalPaginas}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <PagBtn onClick={() => setPagina(1)} disabled={pagina === 1}>«</PagBtn>
            <PagBtn onClick={() => setPagina(p => p - 1)} disabled={pagina === 1}>‹</PagBtn>
            <PagBtn onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas}>›</PagBtn>
            <PagBtn onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas}>»</PagBtn>
          </div>
        </div>
      )}
    </div>
  );
});

export default KardexTable;

const thDark = { background: "#0b1a2c" };

const thGrupo = {
  padding: "7px 10px",
  textTransform: "uppercase" as const,
  fontSize: 9,
  letterSpacing: ".12em",
  fontWeight: 700,
  color: "rgba(255,255,255,0.88)",
  fontFamily: "'IBM Plex Mono', monospace",
};

const thSub = {
  padding: "6px 10px",
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: ".06em",
  color: "#4a7a9a",
  background: "#0a1929",
  borderBottom: "1px solid rgba(56,139,221,0.14)",
};

const td = {
  padding: "9px 10px",
  color: "#6a8ab0",
  borderBottom: "1px solid rgba(55,138,221,0.04)",
};

function PagBtn({ onClick, disabled, children }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "4px 10px",
      borderRadius: 6,
      background: disabled ? "rgba(56,139,221,0.05)" : "rgba(56,139,221,0.15)",
      color: disabled ? "#2a4a6a" : "#60a5fa",
      border: "1px solid " + (disabled ? "rgba(56,139,221,0.08)" : "rgba(56,139,221,0.28)"),
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: 12,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>
      {children}
    </button>
  );
}