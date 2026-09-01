from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.dashboard import DashboardMetricas
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/metricas", response_model=DashboardMetricas)
async def obtener_metricas_dashboard(db: AsyncSession = Depends(get_db)):
    service = DashboardService(db)
    return await service.get_metricas()