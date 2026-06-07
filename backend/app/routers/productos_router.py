from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.producto_service import ProductoService
from app.schemas.producto import ProductoResponse, ProductoConEstadisticas, ProductoUpdate, ProductoCreate

router = APIRouter(prefix="/productos", tags=["Productos"])

# EndPoint para crear un producto de manera manual
@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def crear_producto(
    data: ProductoCreate,
    db:   AsyncSession = Depends(get_db),
):
    """
    Crea un nuevo producto en el catálogo de forma manual.
    - Valida que la combinación de `empresa_id` y `codigo` no se encuentre duplicada.
    """
    service = ProductoService(db)
    return await service.crear(data)

# ── Listar ────────────────────────────────────────────────────────────────────
@router.get("/")
async def listar_productos(
    limit:      int          = Query(100, ge=1, le=500),
    offset:     int          = Query(0,   ge=0),
    search:     str | None   = Query(None, description="Buscar por código o descripción"),
    empresa_id: int | None   = Query(None, description="Filtrar por empresa"),
    db:         AsyncSession = Depends(get_db),
):
    """
    Lista todos los productos con paginación y búsqueda opcional.
    - Si se pasa empresa_id, devuelve solo los productos de esa empresa.
    - El mismo código puede existir en distintas empresas (ej: 011004 en Empresa A y B).
    """
    service = ProductoService(db)
    return await service.listar(
        limit=limit,
        offset=offset,
        search=search,
        empresa_id=empresa_id,
    )


# ── Obtener uno ───────────────────────────────────────────────────────────────
@router.get("/{producto_id}", response_model=ProductoConEstadisticas)
async def obtener_producto(
    producto_id: int,
    db:          AsyncSession = Depends(get_db),
):
    """
    Obtiene un producto con su empresa, saldo inicial vigente
    y estadísticas de movimientos.
    """
    service = ProductoService(db)
    return await service.obtener(producto_id)


# ── Actualizar ────────────────────────────────────────────────────────────────
@router.patch("/{producto_id}", response_model=ProductoResponse)
async def actualizar_producto(
    producto_id: int,
    data:        ProductoUpdate,
    db:          AsyncSession = Depends(get_db),
):
    """
    Actualiza los campos editables de un producto:
    descripcion, codigo_existencia, unidad_medida.
    - Permite cambiar la `empresa_id` para reclasificar productos (ej: de 'SIN ASIGNAR' a otra empresa real).
    """
    service = ProductoService(db)
    return await service.actualizar(producto_id, data)


# ── Eliminar ──────────────────────────────────────────────────────────────────
@router.delete("/{producto_id}")
async def eliminar_producto(
    producto_id: int,
    db:          AsyncSession = Depends(get_db),
):
    """
    Elimina un producto solo si no tiene movimientos registrados.
    Si tiene movimientos retorna error 409.
    """
    service = ProductoService(db)
    return await service.eliminar(producto_id)