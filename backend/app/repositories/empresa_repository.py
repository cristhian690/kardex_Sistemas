from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.empresa import Empresa


class EmpresaRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self) -> list[Empresa]:
        result = await self.db.execute(
            select(Empresa).order_by(Empresa.nombre)
        )
        return list(result.scalars().all())

    async def get_by_id(self, empresa_id: int) -> Empresa | None:
        result = await self.db.execute(
            select(Empresa).where(Empresa.id == empresa_id)
        )
        return result.scalar_one_or_none()

    async def get_by_ruc(self, ruc: str) -> Empresa | None:
        result = await self.db.execute(
            select(Empresa).where(Empresa.ruc == ruc)
        )
        return result.scalar_one_or_none()

    async def crear(self, nombre: str, ruc: str, direccion: str | None) -> Empresa:
        empresa = Empresa(nombre=nombre, ruc=ruc, direccion=direccion)
        self.db.add(empresa)
        await self.db.flush()
        return empresa

    async def update(
        self,
        empresa_id: int,
        nombre:     str | None = None,
        ruc:        str | None = None,
        direccion:  str | None = None,
    ) -> Empresa | None:
        empresa = await self.get_by_id(empresa_id)
        if not empresa:
            return None
        if nombre    is not None: empresa.nombre    = nombre
        if ruc       is not None: empresa.ruc       = ruc
        if direccion is not None: empresa.direccion = direccion
        await self.db.flush()
        return empresa

    async def delete(self, empresa_id: int) -> bool:
        empresa = await self.get_by_id(empresa_id)
        if not empresa:
            return False
        await self.db.delete(empresa)
        await self.db.flush()
        return True