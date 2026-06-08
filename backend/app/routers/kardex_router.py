from fastapi import APIRouter, Depends, UploadFile, File, Query
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
import io


router = APIRouter(prefix="/kardex", tags=["Kardex"])


@router.post("/procesar", response_model=UploadResponse, status_code=201)
async def procesar_kardex(
    movimientos: Annotated[List[UploadFile], File(description="Archivos de movimientos (uno o varios)")],
    saldos:      Annotated[UploadFile | None, File(description="Archivo de saldos iniciales (opcional)")] = None,
    db:          AsyncSession = Depends(get_db),
):
    if not movimientos:
        raise ArchivoInvalidoException("Debes subir al menos un archivo de movimientos")

    archivos_invalidos = [
        f.filename for f in movimientos
        if not f.filename.endswith(".xlsx")
    ]
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


@router.get("/consultar/{procesamiento_id}", response_model=KardexResponse)
async def consultar_kardex(
    procesamiento_id: int,
    codigo:           str | None  = Query(None),
    anio:             int | None  = Query(None),
    mes:              int | None  = Query(None),
    fecha_exacta:     str | None  = Query(None),
    fecha_desde:      str | None  = Query(None),
    fecha_hasta:      str | None  = Query(None),
    db:               AsyncSession = Depends(get_db),
):
    if fecha_desde and not fecha_hasta and not anio and not mes and not fecha_exacta:
        try:
            d           = date.fromisoformat(fecha_desde)
            ultimo_dia  = monthrange(d.year, d.month)[1]
            fecha_hasta = date(d.year, d.month, ultimo_dia).isoformat()
            print(f"⚠️  fecha_hasta auto-completada: {fecha_hasta}")
        except Exception:
            pass

    print(f"🔍 FILTRO: codigo={codigo} anio={anio} mes={mes} desde={fecha_desde} hasta={fecha_hasta}")

    filtros = FiltroKardex(
        codigo       = codigo,
        anio         = anio,
        mes          = mes,
        fecha_exacta = fecha_exacta,
        fecha_desde  = fecha_desde,
        fecha_hasta  = fecha_hasta,
    )

    service = KardexService(db)
    return await service.get_kardex(
        procesamiento_id = procesamiento_id,
        filtros          = filtros,
    )


@router.get("/historial", response_model=list[ProcesamientoResumen])
async def get_historial(
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    db:     AsyncSession = Depends(get_db),
):
    service = KardexService(db)
    return await service.get_historial(limit=limit, offset=offset)


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
    if codigo:
        nombre_archivo += f"_{codigo}"
    if anio and mes:
        nombre_archivo += f"_{anio}_{mes:02d}"
    nombre_archivo += ".xlsx"

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers    = {"Content-Disposition": f"attachment; filename={nombre_archivo}"}
    )