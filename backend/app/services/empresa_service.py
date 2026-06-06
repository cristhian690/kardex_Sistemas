from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.empresa_repository import EmpresaRepository
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate, EmpresaResponse
from app.exceptions import KardexException


class EmpresaService:

    def __init__(self, db: AsyncSession):
        self.db           = db
        self.empresa_repo = EmpresaRepository(db)

    async def listar(self) -> list[EmpresaResponse]:
        empresas = await self.empresa_repo.get_all()
        return [EmpresaResponse.model_validate(e) for e in empresas]

    async def obtener(self, empresa_id: int) -> EmpresaResponse:
        empresa = await self.empresa_repo.get_by_id(empresa_id)
        if not empresa:
            raise KardexException(f"Empresa #{empresa_id} no encontrada.", status_code=404)
        return EmpresaResponse.model_validate(empresa)

    async def crear(self, data: EmpresaCreate) -> EmpresaResponse:
        existente = await self.empresa_repo.get_by_ruc(data.ruc)
        if existente:
            raise KardexException(f"Ya existe una empresa con RUC {data.ruc}.", status_code=400)
        empresa = await self.empresa_repo.crear(
            nombre    = data.nombre,
            ruc       = data.ruc,
            direccion = data.direccion,
        )
        return EmpresaResponse.model_validate(empresa)

    async def actualizar(self, empresa_id: int, data: EmpresaUpdate) -> EmpresaResponse:
        empresa = await self.empresa_repo.update(
            empresa_id = empresa_id,
            nombre     = data.nombre,
            ruc        = data.ruc,
            direccion  = data.direccion,
        )
        if not empresa:
            raise KardexException(f"Empresa #{empresa_id} no encontrada.", status_code=404)
        return EmpresaResponse.model_validate(empresa)

    async def eliminar(self, empresa_id: int) -> None:
        ok = await self.empresa_repo.delete(empresa_id)
        if not ok:
            raise KardexException(f"Empresa #{empresa_id} no encontrada.", status_code=404)