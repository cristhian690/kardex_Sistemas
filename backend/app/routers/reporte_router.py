from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.reporte_service import ReporteService
import io

router = APIRouter(prefix="/reportes", tags=["Reportes"])


@router.get("/kardex/{procesamiento_id}/pdf")
async def exportar_reporte_pdf(
    procesamiento_id: int,
    empresa_id:  int | None = Query(None, description="Filtrar por empresa (opcional)"),
    fecha_desde: str | None = Query(None, description="Fecha inicio YYYY-MM-DD"),
    fecha_hasta: str | None = Query(None, description="Fecha fin YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
):
    """
    Genera un PDF con el kardex agrupado por Empresa → Producto → Movimientos.
    """
    service    = ReporteService(db)
    pdf_bytes  = await service.generar_pdf(
        procesamiento_id = procesamiento_id,
        empresa_id       = empresa_id,
        fecha_desde      = fecha_desde,
        fecha_hasta      = fecha_hasta,
    )

    nombre = f"reporte_kardex_{procesamiento_id}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type = "application/pdf",
        headers    = {"Content-Disposition": f"attachment; filename={nombre}"},
    )