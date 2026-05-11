from app.routers.kardex_router    import router as kardex_router
from app.routers.historial_router import router as historial_router
from app.routers.saldos_router    import router as saldos_router
from app.routers.productos_router import router as productos_router
from app.routers.auth_router      import router as auth_router

__all__ = [
    "kardex_router",
    "historial_router",
    "saldos_router",
    "productos_router",
    "auth_router",        
]