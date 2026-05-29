from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.saldo_service import SaldoService
from app.schemas.saldo_inicial import (
    SaldoInicialCreate,
    SaldoInicialUpdate,
    SaldoInicialResponse,
    SaldoInicialConAdvertencia,
    EliminarMultipleSaldosRequest,
)

router = APIRouter(prefix="/saldos", tags=["Saldos Iniciales"])


# ── Listar todos ──────────────────────────────────────────────────────────────
@router.get("/", response_model=list[SaldoInicialResponse])
async def listar_saldos(
    limit:  int = Query(400, ge=1, le=500),
    offset: int = Query(0,   ge=0),
    db:     AsyncSession = Depends(get_db),
):
    """Lista todos los saldos iniciales registrados."""
    service = SaldoService(db)
    return await service.listar(limit=limit, offset=offset)


# ── Obtener uno ───────────────────────────────────────────────────────────────
@router.get("/{saldo_id}", response_model=SaldoInicialResponse)
async def obtener_saldo(
    saldo_id: int,
    db:       AsyncSession = Depends(get_db),
):
    """Obtiene un saldo inicial por su ID."""
    service = SaldoService(db)
    return await service.obtener(saldo_id)


# ── Crear ─────────────────────────────────────────────────────────────────────
@router.post("/", response_model=SaldoInicialConAdvertencia, status_code=201)
async def crear_saldo(
    data: SaldoInicialCreate,
    db:   AsyncSession = Depends(get_db),
):
    """
    Crea o actualiza el saldo inicial de un producto.
    Si el producto no existe lo registra automáticamente.
    Si ya existe un saldo para ese producto lo actualiza.
    Incluye advertencia si el producto ya tiene procesamientos.
    """
    service = SaldoService(db)
    return await service.crear(data)


# ── Actualizar ────────────────────────────────────────────────────────────────
@router.put("/{saldo_id}", response_model=SaldoInicialConAdvertencia)
async def actualizar_saldo(
    saldo_id: int,
    data:     SaldoInicialUpdate,
    db:       AsyncSession = Depends(get_db),
):
    """
    Actualiza un saldo inicial existente.
    Incluye advertencia si el saldo ya fue usado en procesamientos.
    """
    service = SaldoService(db)
    return await service.actualizar(saldo_id, data)


# ── Eliminar múltiple ─────────────────────────────────────────────────────────
@router.post("/eliminar-multiple")
async def eliminar_multiple_saldos(
    payload: EliminarMultipleSaldosRequest,
    db:      AsyncSession = Depends(get_db),
):
    """
    Elimina varios saldos iniciales a la vez.
    Recibe una lista de IDs.
    """
    service = SaldoService(db)
    return await service.eliminar_multiple(payload.ids)


# ── Eliminar ──────────────────────────────────────────────────────────────────
@router.delete("/{saldo_id}")
async def eliminar_saldo(
    saldo_id: int,
    db:       AsyncSession = Depends(get_db),
):
    """
    Elimina un saldo inicial.
    Incluye advertencia si el saldo ya fue usado en procesamientos.
    """
    service = SaldoService(db)
    return await service.eliminar(saldo_id)