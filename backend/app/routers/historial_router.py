from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from app.core.database import get_db
from app.repositories import ProcesamientoRepository, MovimientoRepository
from app.schemas.procesamiento import ProcesamientoResponse, ProcesamientoResumen
from app.exceptions import NotFoundException

router = APIRouter(prefix="/historial", tags=["Historial"])


# ── Schema para eliminación múltiple ──────────────────────────────────────────
class EliminarMultipleRequest(BaseModel):
    ids: list[int]


@router.get("/", response_model=list[ProcesamientoResumen])
async def listar_historial(
    limit:  int = Query(20, ge=1, le=100),
    offset: int = Query(0,  ge=0),
    db:     AsyncSession = Depends(get_db),
):
    """Lista el historial de procesamientos del más reciente al más antiguo."""
    repo = ProcesamientoRepository(db)
    return await repo.get_historial(limit=limit, offset=offset)


@router.get("/{procesamiento_id}", response_model=ProcesamientoResponse)
async def obtener_procesamiento(
    procesamiento_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Retorna el detalle de un procesamiento con sus alertas."""
    repo          = ProcesamientoRepository(db)
    procesamiento = await repo.get_by_id(procesamiento_id)
    if not procesamiento:
        raise NotFoundException(f"Procesamiento #{procesamiento_id} no encontrado.")
    return procesamiento


@router.delete("/{procesamiento_id}")
async def eliminar_procesamiento(
    procesamiento_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Elimina un procesamiento y todos sus movimientos asociados (CASCADE).
    Util para limpiar procesamientos incorrectos o de prueba.
    """
    proc_repo = ProcesamientoRepository(db)
    mov_repo  = MovimientoRepository(db)

    procesamiento = await proc_repo.get_by_id(procesamiento_id)
    if not procesamiento:
        raise NotFoundException(f"Procesamiento #{procesamiento_id} no encontrado.")

    # Borrar movimientos primero (esto evita FK violation)
    await mov_repo.delete_by_procesamiento(procesamiento_id)

    # Borrar procesamiento
    await db.delete(procesamiento)

    return {
        "mensaje": f"Procesamiento #{procesamiento_id} y sus movimientos eliminados correctamente.",
        "archivo": procesamiento.nombre_archivo,
    }


# ── NUEVO: Eliminación múltiple ───────────────────────────────────────────────
@router.post("/eliminar-multiple")
async def eliminar_multiple(
    payload: EliminarMultipleRequest,
    db:      AsyncSession = Depends(get_db),
):
    """
    Elimina varios procesamientos a la vez (y sus movimientos asociados).
    Recibe lista de IDs en el body. Devuelve resumen de cuántos se eliminaron.
    """
    if not payload.ids:
        return {"eliminados": 0, "fallidos": [], "mensaje": "No hay IDs para eliminar."}

    proc_repo = ProcesamientoRepository(db)
    mov_repo  = MovimientoRepository(db)

    eliminados = 0
    fallidos: list[int] = []

    for pid in payload.ids:
        proc = await proc_repo.get_by_id(pid)
        if not proc:
            fallidos.append(pid)
            continue
        try:
            await mov_repo.delete_by_procesamiento(pid)
            await db.delete(proc)
            eliminados += 1
        except Exception:
            fallidos.append(pid)

    return {
        "eliminados": eliminados,
        "fallidos":   fallidos,
        "mensaje":    f"{eliminados} procesamiento(s) eliminado(s) correctamente.",
    }