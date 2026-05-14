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

// 🎯 mapa de color según TU lógica
const getSemaforo = (row: KardexRow) => {
  if (row.saldo_negativo) return "🔴";
  if (row.error_a || row.error_b) return "🟡";
  return "🟢";
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

  const primerErrorIndex = useMemo(() => {
    return movimientos.findIndex(
      (m) => m.error_a || m.error_b || m.saldo_negativo
    );
  }, [movimientos]);

  // Función interna: localizar primera fila por código
  const findPrimerIndexCodigo = (codigo: string) => {
    return movimientos.findIndex(m => String(m.codigo).trim() === String(codigo).trim());
  };

  useImperativeHandle(
    ref,
    () => ({
      scrollToFirstAnomaly: () => {
        if (primerErrorIndex === -1) return;
        const paginaError = Math.floor(primerErrorIndex / FILAS_POR_PAGINA) + 1;
        if (pagina === paginaError) {
          queueMicrotask(() => {
            firstErrorRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          });
          return;
        }
        pendingScrollToAnomaly.current = true;
        setPagina(paginaError);
      },
      scrollToCodigo: (codigo: string) => {
        const idx = findPrimerIndexCodigo(codigo);
        if (idx === -1) return;
        const paginaTarget = Math.floor(idx / FILAS_POR_PAGINA) + 1;

        // Guardar el código para hacer scroll después del render
        pendingScrollToCodigo.current = codigo;

        if (pagina === paginaTarget) {
          // Ya estamos en la página correcta — scroll inmediato
          queueMicrotask(() => {
            codigoTargetRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            // Highlight de 1.5s
            setHighlightIndex(idx);
            setTimeout(() => setHighlightIndex(null), 4000);
          });
        } else {
          // Cambiar página primero
          setPagina(paginaTarget);
        }
      },
    }),
    [pagina, primerErrorIndex, movimientos]
  );

  // Scroll a anomalía cuando cambia la página
  useLayoutEffect(() => {
    if (!pendingScrollToAnomaly.current) return;
    if (primerErrorIndex === -1) {
      pendingScrollToAnomaly.current = false;
      return;
    }
    firstErrorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    pendingScrollToAnomaly.current = false;
  }, [pagina, primerErrorIndex]);

  // Scroll a código específico cuando cambia la página
  useLayoutEffect(() => {
    if (!pendingScrollToCodigo.current) return;
    const codigo = pendingScrollToCodigo.current;
    const idx = findPrimerIndexCodigo(codigo);
    pendingScrollToCodigo.current = null;
    if (idx === -1) return;

    queueMicrotask(() => {
      codigoTargetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setHighlightIndex(idx);
      setTimeout(() => setHighlightIndex(null), 1500);
    });
  }, [pagina]);

  // Exponer función global para AlertaBanner
  useEffect(() => {
    (window as any).__kardexIrAFila = (codigo: string) => {
      const idx = findPrimerIndexCodigo(codigo);
      if (idx === -1) return;
      const paginaTarget = Math.floor(idx / FILAS_POR_PAGINA) + 1;
      pendingScrollToCodigo.current = codigo;
      if (pagina === paginaTarget) {
        queueMicrotask(() => {
          codigoTargetRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          setHighlightIndex(idx);
          setTimeout(() => setHighlightIndex(null), 4000);
        });
      } else {
        setPagina(paginaTarget);
      }
    };

    return () => {
      delete (window as any).__kardexIrAFila;
    };
  }, [movimientos, pagina]);

  const totalPaginas = Math.ceil(movimientos.length / FILAS_POR_PAGINA);

  const filas = useMemo(() => {
    return movimientos.slice(
      (pagina - 1) * FILAS_POR_PAGINA,
      pagina * FILAS_POR_PAGINA
    );
  }, [movimientos, pagina]);

  if (movimientos.length === 0) {
    return <div style={{ padding: 40, textAlign: "center", color: "#2a5080" }}>Sin datos</div>;
  }

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{
          borderCollapse: "separate",
          borderSpacing: 0,
          fontSize: 11,
          tableLayout: "fixed",
          minWidth: 1200
        }}>

          {/* HEADER GRUPOS */}
          <thead>
            <tr>
              {mostrarSemaforo && <th style={thDark}></th>}
              <th style={thDark}></th>
              <th style={thDark}></th>

              <th colSpan={4} style={{ ...thGrupo, background: "#185FA5" }}>Comprobante</th>
              <th style={{ ...thGrupo, background: "#0F6E56" }}>Tipo operación</th>
              <th colSpan={3} style={{ ...thGrupo, background: "#0B5E3A" }}>Entradas</th>
              <th colSpan={3} style={{ ...thGrupo, background: "#7A2020" }}>Salidas</th>
              <th colSpan={3} style={{ ...thGrupo, background: "#1A3A5C" }}>Saldo final</th>
            </tr>

            <tr style={{ background: "#0a1929" }}>
              {mostrarSemaforo && <th style={thSub}>Est</th>}
              <th style={thSub}>#</th>
              <th style={thSub}>Cód.</th>

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
              const globalIndex = (pagina - 1) * FILAS_POR_PAGINA + i;
              const esError = globalIndex === primerErrorIndex;
              const esHighlight = globalIndex === highlightIndex;
              const semaforo = getSemaforo(row);
              const tieneError = semaforo !== "🟢";

              const bgBase = esHighlight
                ? "rgba(96,165,250,0.22)"
                : esError
                ? "rgba(245,158,11,0.15)"
                : tieneError
                ? "rgba(226,75,74,0.06)"
                : i % 2 === 0
                ? "transparent"
                : "rgba(55,138,221,0.03)";

              // Asignar ref si es el primer error O el target del scroll por código
              const isCodigoTarget =
                pendingScrollToCodigo.current === null &&
                highlightIndex === globalIndex;

              const rowRef = esError
                ? firstErrorRef
                : isCodigoTarget
                ? codigoTargetRef
                : null;

              return (
                <tr
                  key={row.id}
                  ref={rowRef}
                  onMouseEnter={e => {
                    if (!esHighlight) {
                      e.currentTarget.style.background = "rgba(56,139,221,0.09)"
                    }
                  }}
                  onMouseLeave={e => { e.currentTarget.style.background = bgBase }}
                  style={{
                    background: bgBase,
                    transition: "background .3s",
                    boxShadow: esHighlight ? "inset 0 0 0 2px rgba(96,165,250,0.55)" : "none",
                  }}
                >
                  {mostrarSemaforo && <td style={td}>{semaforo}</td>}
                  <td style={td}>{row.fila}</td>
                  <td style={{ ...td, color: "#378ADD", fontWeight: 600 }}>{row.codigo}</td>

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

                  <td style={{ ...td, fontWeight: 600, color: "#85b7eb" }}>
                    {fmtCant(row.saldo_cantidad)}
                  </td>
                  <td style={td}>{fmtUnit(row.saldo_costo_unit)}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#85b7eb" }}>
                    {fmtTotal(row.saldo_costo_total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      {totalPaginas > 1 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderTop: "1px solid rgba(55,138,221,0.08)"
        }}>
          <span style={{ fontSize: 10, color: "#2a5080" }}>
            Página {pagina} de {totalPaginas}
          </span>

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

// estilos
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