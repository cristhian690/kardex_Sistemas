from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.routers import (
    kardex_router,
    historial_router,
    saldos_router,
    productos_router,
    auth_router,
    empresa_router,
)
from app.exceptions import KardexException, kardex_exception_handler, generic_exception_handler

# ── Importar modelos para que Alembic los detecte ─────────────────────────────
from app.models import Producto, SaldoInicial, Procesamiento, Movimiento, Usuario  # noqa: F401
from app.models.empresa import Empresa  # noqa: F401


app = FastAPI(
    title       = settings.APP_NAME,
    version     = settings.APP_VERSION,
    description = "API para el procesamiento de Kardex de Inventario con Costo Promedio Ponderado.",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

app.add_exception_handler(KardexException, kardex_exception_handler)
app.add_exception_handler(Exception,       generic_exception_handler)

app.include_router(kardex_router,    prefix="/api/v1")
app.include_router(historial_router, prefix="/api/v1")
app.include_router(saldos_router,    prefix="/api/v1")
app.include_router(productos_router, prefix="/api/v1")
app.include_router(auth_router,      prefix="/api/v1")
app.include_router(empresa_router,   prefix="/api/v1")


@app.on_event("startup")
async def startup():
    pass


@app.get("/health", tags=["Sistema"])
async def health_check():
    return {
        "status":  "ok",
        "app":     settings.APP_NAME,
        "version": settings.APP_VERSION,
    }