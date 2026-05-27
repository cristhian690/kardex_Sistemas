from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.empresa import Empresa
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate, EmpresaResponse

router = APIRouter(prefix="/empresa", tags=["Empresa"])


@router.get("/", response_model=list[EmpresaResponse])
async def get_empresas(db: AsyncSession = Depends(get_db)):
    """Retorna todas las empresas registradas."""
    result = await db.execute(select(Empresa).order_by(Empresa.codigo_producto))
    return list(result.scalars().all())


@router.get("/{codigo_producto}", response_model=EmpresaResponse | None)
async def get_empresa_by_codigo(
    codigo_producto: str,
    db: AsyncSession = Depends(get_db),
):
    """Retorna la empresa asociada a un código de producto."""
    result = await db.execute(
        select(Empresa).where(Empresa.codigo_producto == codigo_producto)
    )
    return result.scalar_one_or_none()


@router.post("/", response_model=EmpresaResponse, status_code=201)
async def crear_empresa(
    payload: EmpresaCreate,
    db: AsyncSession = Depends(get_db),
):
    """Crea una empresa ligada a un código de producto."""
    result = await db.execute(
        select(Empresa).where(Empresa.codigo_producto == payload.codigo_producto)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una empresa para el código {payload.codigo_producto}. Use PUT para actualizar."
        )
    empresa = Empresa(**payload.model_dump())
    db.add(empresa)
    await db.commit()
    await db.refresh(empresa)
    return empresa


@router.put("/{codigo_producto}", response_model=EmpresaResponse)
async def actualizar_empresa(
    codigo_producto: str,
    payload: EmpresaUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Actualiza los datos de una empresa por código de producto."""
    result = await db.execute(
        select(Empresa).where(Empresa.codigo_producto == codigo_producto)
    )
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")

    for campo, valor in payload.model_dump(exclude_none=True).items():
        setattr(empresa, campo, valor)

    await db.commit()
    await db.refresh(empresa)
    return empresa


@router.delete("/{codigo_producto}", status_code=204)
async def eliminar_empresa(
    codigo_producto: str,
    db: AsyncSession = Depends(get_db),
):
    """Elimina la empresa asociada a un código de producto."""
    result = await db.execute(
        select(Empresa).where(Empresa.codigo_producto == codigo_producto)
    )
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada.")
    await db.delete(empresa)
    await db.commit()