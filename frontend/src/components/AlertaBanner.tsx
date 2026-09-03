import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { AlertasProcesamiento } from '../types'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface AlertaBannerProps {
  alertas:           AlertasProcesamiento
  erroresIntegridad: number
}

export default function AlertaBanner({ alertas, erroresIntegridad }: AlertaBannerProps) {
  const [expandido, setExpandido] = useState(false)
  const hayAlertas =
    alertas.sin_saldo_inicial.length > 0 ||
    alertas.saldo_negativo.length    > 0 ||
    alertas.duplicados.length        > 0 ||
    erroresIntegridad                > 0

  if (!hayAlertas) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(34,197,94,0.05)',
        border: '1px solid rgba(34,197,94,0.18)',
        borderLeft: '3px solid rgba(34,197,94,0.55)',
        color: '#86efac',
        borderRadius: 8,
        padding: '6px 12px',
        fontSize: 11,
        fontWeight: 500,
      }}>
        <IconCheck />
        <span>Verificación de integridad correcta — todos los registros son consistentes.</span>
      </div>
    )
  }

  const cantTiposAnomalias = (alertas.sin_saldo_inicial.length > 0 ? 1 : 0) + 
                             (alertas.saldo_negativo.length > 0 ? 1 : 0) + 
                             (alertas.duplicados.length > 0 ? 1 : 0) + 
                             (erroresIntegridad > 0 ? 1 : 0)

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg overflow-hidden transition-all shadow-sm">
      <button 
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-amber-500/10 transition-colors cursor-pointer text-amber-600 dark:text-amber-500"
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
          <IconWarning />
          <span>Atención: Se han detectado anomalías ({cantTiposAnomalias} tipos) en el procesamiento</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-medium opacity-80">
          <span>{expandido ? 'Ocultar detalles' : 'Ver detalles'}</span>
          {expandido ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </div>
      </button>

      {expandido && (
        <div className="px-4 pb-4 pt-2 flex flex-col gap-2 border-t border-amber-500/10 bg-background/50">
          {alertas.duplicados.length > 0 && (
            <Banner
              tipo="error"
              titulo="Códigos duplicados en múltiples archivos"
              items={alertas.duplicados}
            />
          )}

          {alertas.saldo_negativo.length > 0 && (
            <Banner
              tipo="error"
              titulo={`Saldo negativo detectado en ${alertas.saldo_negativo.length} producto(s)`}
              items={alertas.saldo_negativo}
              descripcion="Hay más salidas que stock disponible. Haz clic en una fila para ir a ella."
              clickeable
            />
          )}

          {alertas.sin_saldo_inicial.length > 0 && (
            <Banner
              tipo="warning"
              titulo="Productos sin saldo inicial (calculados desde cero)"
              items={alertas.sin_saldo_inicial}
              descripcion="Haz clic en un código para ir a la primera fila afectada."
              clickeable
            />
          )}

          {erroresIntegridad > 0 && (
            <Banner
              tipo="info"
              titulo={`${erroresIntegridad.toLocaleString()} fila(s) con anomalías de integridad`}
              descripcion='Activa "Mostrar verificación" en la tabla para ver el detalle.'
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-componente Banner ────────────────────────────────────────────────────
interface BannerProps {
  tipo:         'error' | 'warning' | 'info'
  titulo:       string
  items?:       string[]
  descripcion?: string
  clickeable?:  boolean
}

function Banner({ tipo, titulo, items, descripcion, clickeable }: BannerProps) {
  const config = {
    error: {
      bg:     'rgba(239,68,68,0.05)',
      border: 'rgba(239,68,68,0.18)',
      accent: 'rgba(239,68,68,0.55)',
      text:   '#fca5a5',
      chipBg: 'rgba(239,68,68,0.1)',
      chipBd: 'rgba(239,68,68,0.25)',
      Icon:   IconError,
    },
    warning: {
      bg:     'rgba(245,158,11,0.05)',
      border: 'rgba(245,158,11,0.18)',
      accent: 'rgba(245,158,11,0.55)',
      text:   '#d4a574',
      chipBg: 'rgba(245,158,11,0.1)',
      chipBd: 'rgba(245,158,11,0.25)',
      Icon:   IconWarning,
    },
    info: {
      bg:     'rgba(59,130,246,0.05)',
      border: 'rgba(59,130,246,0.18)',
      accent: 'rgba(59,130,246,0.55)',
      text:   '#93c5fd',
      chipBg: 'rgba(59,130,246,0.1)',
      chipBd: 'rgba(59,130,246,0.25)',
      Icon:   IconInfo,
    },
  }[tipo]

  const irAFila = (codigo: string) => {
    const fn = (window as any).__kardexIrAFila
    if (typeof fn === 'function') fn(codigo)
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    gap: 10,
    background: config.bg,
    border: `1px solid ${config.border}`,
    borderLeft: `3px solid ${config.accent}`,
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    color: config.text,
  }

  return (
    <div style={containerStyle}>
      <span style={{ flexShrink: 0, marginTop: 2, color: config.accent, opacity: 0.9 }}>
        <config.Icon />
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{titulo}</div>

        {descripcion && (
          <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>
            {descripcion}
          </div>
        )}

        {items && items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {items.map(item => (
              <Chip
                key={item}
                label={item}
                bg={config.chipBg}
                border={config.chipBd}
                color={config.text}
                clickeable={!!clickeable}
                onClick={clickeable ? () => irAFila(item) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Chip ────────────────────────────────────────────────────────────────────
function Chip({
  label, bg, border, color, clickeable, onClick,
}: {
  label: string; bg: string; border: string; color: string;
  clickeable: boolean; onClick?: () => void;
}) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: bg,
    border: `1px solid ${border}`,
    color,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10.5,
    padding: '2px 7px',
    borderRadius: 12,
    cursor: clickeable ? 'pointer' : 'default',
    userSelect: 'none',
    transition: 'background .12s',
  }

  return (
    <span
      style={style}
      onClick={onClick}
      title={clickeable ? 'Clic para ir a la fila' : undefined}
      onMouseEnter={e => {
        if (clickeable) {
          ;(e.currentTarget as HTMLSpanElement).style.background = border // un poco más opaco al hover
        }
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLSpanElement).style.background = bg
      }}
    >
      {label}
      {clickeable && <span style={{ opacity: 0.5, fontSize: 9 }}>↓</span>}
    </span>
  )
}

// ── Iconos SVG sutiles ──────────────────────────────────────────────────────
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconWarning = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const IconError = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
)

const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)