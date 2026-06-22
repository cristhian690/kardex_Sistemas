# ⚠️ Configuración requerida en PostgreSQL (TEMPORAL)

> 🚨 IMPORTANTE: Esto es una solución **temporal** mientras se implementa la creación automática de ENUMs en **Alembic**.  
> En el futuro estos tipos serán gestionados mediante migraciones y no será necesario ejecutarlo manualmente.

---

## 🧩 Ejecutar en PostgreSQL

Antes de iniciar el backend, debes crear manualmente los tipos ENUM en la base de datos:

```sql
CREATE TYPE estado_proceso AS ENUM (
    'pendiente',
    'procesado',
    'error',
    'con_alertas'
);

CREATE TYPE tipo_operacion_enum AS ENUM (
    'venta',
    'compra',
    'devolucion',
    'devolucion_entregada'
);

