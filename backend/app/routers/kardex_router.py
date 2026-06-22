from fastapi import APIRouter, Depends, UploadFile, File, Query, Body, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated, List
from app.core.database import get_db
from app.services.kardex_service import KardexService
from app.services.excel_service import ExcelService
from app.schemas.kardex import KardexResponse, UploadResponse, FiltroKardex
from app.schemas.procesamiento import ProcesamientoResumen
from app.exceptions import ArchivoInvalidoException
from datetime import date
from calendar import monthrange
from decimal import Decimal
import io

router = APIRouter(prefix="/kardex", tags=["Kardex"])

# ── Subir y procesar archivos ─────────────────────────────────────────────────
@router.post("/procesar", response_model=UploadResponse, status_code=201)
async def procesar_kardex(
    movimientos: Annotated[List[UploadFile], File(description="Archivos de movimientos (uno o varios)")],
    saldos:      Annotated[UploadFile | None, File(description="Archivo de saldos iniciales (opcional)")] = None,
    db:          AsyncSession = Depends(get_db),
):
    """
    Sube y procesa archivos Excel de kardex vinculados a una empresa.
    Acepta uno o varios archivos de movimientos (sin límite).
    Calcula el saldo final, verifica integridad y persiste en BD.
    """
    if not movimientos:
        raise ArchivoInvalidoException("Debes subir al menos un archivo de movimientos")

    archivos_invalidos = [f.filename for f in movimientos if not f.filename.endswith(".xlsx")]
    if archivos_invalidos:
        raise ArchivoInvalidoException(
            f"Los siguientes archivos no son .xlsx: {', '.join(archivos_invalidos)}"
        )
    if saldos and not saldos.filename.endswith(".xlsx"):
        raise ArchivoInvalidoException("El archivo de saldos iniciales debe ser .xlsx")

    saldo_bytes  = await saldos.read() if saldos else None
    archivos_mov = [(f.filename, await f.read()) for f in movimientos]

    service = KardexService(db)
    return await service.procesar_archivos(
        saldo_bytes  = saldo_bytes,
        archivos_mov = archivos_mov,
    )


# ── Revalidar Tolerancia en Caliente ──────────────────────────────────────────
@router.post("/{procesamiento_id}/revalidar")
async def revalidar_tolerancia(
    procesamiento_id: int,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Recalcula las anomalías (Error A y Error B) de un procesamiento existente 
    basándose en un nuevo límite de tolerancia sin procesar el Excel otra vez.
    """
    tolerancia_str = payload.get("tolerancia", "0.10")
    try:
        tolerancia = Decimal(tolerancia_str)
        if tolerancia < 0:
            raise HTTPException(status_code=400, detail="La tolerancia no puede ser negativa")
    except Exception:
        raise HTTPException(status_code=400, detail="Formato de tolerancia inválido")

    service = KardexService(db)
    await service.revalidar_anomalias(procesamiento_id, tolerancia)

    return {"status": "success", "tolerancia_aplicada": str(tolerancia)}


# ── Consultar kardex con filtros ──────────────────────────────────────────────
@router.get("/consultar/{procesamiento_id}", response_model=KardexResponse)
async def consultar_kardex(
    procesamiento_id: int,
    codigo:           str | None  = Query(None, description="Código del producto"),
    anio:             int | None  = Query(None, description="Año"),
    mes:              int | None  = Query(None, description="Mes (1-12)"),
    fecha_exacta:     str | None  = Query(None, description="Fecha exacta (YYYY-MM-DD)"),
    fecha_desde:      str | None  = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_hasta:      str | None  = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    db:               AsyncSession = Depends(get_db),
):
    """
    Consulta el kardex procesado desde BD con filtros opcionales.
    Auto-completa el fin de mes si solo se envía la fecha de inicio.
    """
    if fecha_desde and not fecha_hasta and not anio and not mes and not fecha_exacta:
        try:
            d = date.fromisoformat(fecha_desde)
            ultimo_dia = monthrange(d.year, d.month)[1]
            fecha_hasta = date(d.year, d.month, ultimo_dia).isoformat()
        except ValueError:
            pass

    filtros = FiltroKardex(
        codigo       = codigo,
        anio         = anio,
        mes          = mes,
        fecha_exacta = fecha_exacta,
        fecha_desde  = fecha_desde,
        fecha_hasta  = fecha_hasta,
    )

    service = KardexService(db)
    return await service.get_kardex(procesamiento_id, filtros)


# ── Historial de procesamientos ───────────────────────────────────────────────
@router.get("/historial", response_model=list[ProcesamientoResumen])
async def get_historial(
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    db:     AsyncSession = Depends(get_db),
):
    """
    Retorna el historial de procesamientos paginado.
    """
    service = KardexService(db)
    return await service.get_historial(limit=limit, offset=offset)


# ── Exportar a Excel ──────────────────────────────────────────────────────────
@router.get("/exportar/{procesamiento_id}")
async def exportar_excel(
    procesamiento_id: int,
    codigo:      str | None  = Query(None),
    anio:        int | None  = Query(None),
    mes:         int | None  = Query(None),
    fecha_desde: str | None  = Query(None),
    fecha_hasta: str | None  = Query(None),
    db:          AsyncSession = Depends(get_db),
):
    """
    Exporta los resultados filtrados a un archivo Excel (.xlsx).
    """
    if anio and mes:
        fecha_desde_parsed = date(anio, mes, 1)
        ultimo_dia         = monthrange(anio, mes)[1]
        fecha_hasta_parsed = date(anio, mes, ultimo_dia)
    else:
        fecha_desde_parsed = date.fromisoformat(fecha_desde) if fecha_desde else None
        if fecha_desde_parsed and not fecha_hasta:
            ultimo_dia         = monthrange(fecha_desde_parsed.year, fecha_desde_parsed.month)[1]
            fecha_hasta_parsed = date(fecha_desde_parsed.year, fecha_desde_parsed.month, ultimo_dia)
        else:
            fecha_hasta_parsed = date.fromisoformat(fecha_hasta) if fecha_hasta else None

    service     = ExcelService(db)
    excel_bytes = await service.exportar(
        procesamiento_id = procesamiento_id,
        codigo           = codigo,
        fecha_desde      = fecha_desde_parsed,
        fecha_hasta      = fecha_hasta_parsed,
    )

    nombre_archivo = f"kardex_{procesamiento_id}"
    if codigo: nombre_archivo += f"_{codigo}"
    if anio and mes: nombre_archivo += f"_{anio}_{mes:02d}"
    nombre_archivo += ".xlsx"

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers    = {"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )