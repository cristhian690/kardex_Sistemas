import { useState } from "react";

interface Props {
  procesamientoId: number;
  empresaId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

export default function ReporteKardex({
  procesamientoId,
  empresaId,
  fechaDesde,
  fechaHasta,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const descargarPDF = async () => {
    setLoading(true);
    setError(null);

    try {
      // Construir query params
      const params = new URLSearchParams();
      if (empresaId)   params.set("empresa_id",  String(empresaId));
      if (fechaDesde)  params.set("fecha_desde",  fechaDesde);
      if (fechaHasta)  params.set("fecha_hasta",  fechaHasta);

      const url = `/api/reportes/kardex/${procesamientoId}/pdf?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          // Si usas JWT, añade aquí el token
          // Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Error ${res.status}`);
      }

      // Disparar descarga en el navegador
      const blob     = await res.blob();
      const blobUrl  = URL.createObjectURL(blob);
      const link     = document.createElement("a");
      link.href      = blobUrl;
      link.download  = `reporte_kardex_${procesamientoId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setError(err.message ?? "Error al generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={descargarPDF}
        disabled={loading}
        className="
          inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
          bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-150
        "
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Generando PDF...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17a9 9 0 0118 0M12 3v4" />
            </svg>
            Descargar Reporte PDF
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}