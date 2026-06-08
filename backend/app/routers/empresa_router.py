from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.empresa_service import EmpresaService
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate, EmpresaResponse

router = APIRouter(prefix="/empresa", tags=["Empresa"])


@router.get("/", response_model=list[EmpresaResponse])
async def listar_empresas(db: AsyncSession = Depends(get_db)):
    return await EmpresaService(db).listar()


@router.get("/selector", response_model=list[EmpresaResponse])
async def listar_empresas_selector(db: AsyncSession = Depends(get_db)):
    """Solo empresas reales, excluye SIN ASIGNAR (id=1)."""
    empresas = await EmpresaService(db).listar()
    return [e for e in empresas if e.id != 1]


@router.get("/por-procesamiento/{procesamiento_id}", response_model=EmpresaResponse | None)
async def obtener_empresa_por_procesamiento(
    procesamiento_id: int,
    codigo:           str | None = Query(None, description="Código del producto (opcional)"),
    db:               AsyncSession = Depends(get_db),
):
    return await EmpresaService(db).obtener_por_procesamiento(
        procesamiento_id = procesamiento_id,
        codigo           = codigo,
    )


@router.get("/{empresa_id}", response_model=EmpresaResponse)
async def obtener_empresa(empresa_id: int, db: AsyncSession = Depends(get_db)):
    return await EmpresaService(db).obtener(empresa_id)


@router.post("/", response_model=EmpresaResponse, status_code=201)
async def crear_empresa(data: EmpresaCreate, db: AsyncSession = Depends(get_db)):
    return await EmpresaService(db).crear(data)


@router.put("/{empresa_id}", response_model=EmpresaResponse)
async def actualizar_empresa(
    empresa_id: int,
    data:       EmpresaUpdate,
    db:         AsyncSession = Depends(get_db),
):
    return await EmpresaService(db).actualizar(empresa_id, data)


@router.delete("/{empresa_id}", status_code=204)
async def eliminar_empresa(empresa_id: int, db: AsyncSession = Depends(get_db)):
    await EmpresaService(db).eliminar(empresa_id)