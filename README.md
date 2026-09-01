# Kardex Valorizado

<div align="center">

[![Versión](https://img.shields.io/badge/Versi%C3%B3n-1.0.0-blue.svg)](#)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)](#)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg?logo=postgresql)](#)
[![UI](https://img.shields.io/badge/UI-Shadcn-black.svg)](#)

**Sistema web profesional para el procesamiento, validación y análisis de inventarios valorizados mediante el método de Costo Promedio Ponderado (CPP).**

</div>

---

## 📖 Acerca del Proyecto

Kardex Valorizado permite procesar grandes volúmenes de movimientos desde archivos Excel, detectar inconsistencias matemáticas, administrar saldos iniciales históricos y generar reportes analíticos precisos para auditoría, control interno y gestión contable.

Todo respaldado por una arquitectura modular, una experiencia de usuario orientada a personal administrativo y contable, y un sistema de validaciones diseñado para facilitar la detección de inconsistencias sin alterar la información original.

---

## ✨ Características Principales

### ⚙️ Procesamiento Inteligente
* **Carga Masiva:** Importa uno o múltiples archivos Excel simultáneamente.
* **Motor Matemático:** Recalcula automáticamente costos y saldos (Método CPP).
* **Ordenamiento Dinámico:** Reconstruye la cronología exacta de movimientos.
* **Costos Reconstruidos:** Cuando un movimiento carece de costo unitario, el sistema utiliza información histórica disponible para continuar el cálculo y marca el movimiento para revisión posterior.

### 🛡️ Auditoría y Validaciones
* **Reglas de Integridad:** Detección de errores donde el archivo original discrepa de los cálculos del sistema.
* **Alertas de Saldo Negativo:** Detección estricta de roturas de stock o ventas en falso.
* **Revalidación Inteligente:** Permite modificar la tolerancia de validación sin reprocesar los archivos, recalculando únicamente la clasificación de anomalías detectadas.
* **Semáforos Visuales:** Indicadores de colores que señalan el nivel de criticidad en cada fila procesada.

### 📊 Análisis y Trazabilidad
* **Panel de Análisis:** Métricas operativas y visualizaciones para el seguimiento de movimientos, saldos e inconsistencias.
* **Trazabilidad:** Historial completo de los archivos procesados, con posibilidad de administrar y eliminar registros que ya no sean necesarios.

### 🗄️ Gestión Integral (CRUD)
* **Creación Automática de Productos:** Si durante el procesamiento se detectan códigos inexistentes, el sistema los registra automáticamente para su posterior clasificación y asignación empresarial.
* **Saldos Iniciales Históricos:** Permite registrar múltiples saldos iniciales para un mismo producto. Durante el procesamiento, el sistema selecciona automáticamente el saldo más reciente cuya fecha sea igual o anterior al periodo evaluado.

### 📚 Soporte al Usuario
* **Recorrido Guiado:** Tour interactivo para usuarios nuevos.
* **Centro de Ayuda:** Documentación rápida integrada.
* **Manual de Usuario:** Formato imprimible en PDF.
* **Tooltips Explicativos:** Ayuda contextual en módulos críticos.

---

## 🎯 Casos de Uso

Kardex Valorizado está orientado a:

- Empresas comerciales.
- Empresas importadoras.
- Distribuidores.
- Áreas contables.
- Auditorías internas.
- Control de inventarios históricos.
- Validación de movimientos provenientes de sistemas externos.

El sistema permite identificar diferencias entre los cálculos originales y los resultados obtenidos mediante el método de Costo Promedio Ponderado, facilitando la detección de errores operativos y contables.

---

## 🧱 Stack Tecnológico

### 💻 Frontend
- **Framework Core:** React 19 + Vite
- **Lenguaje:** TypeScript
- **Estilos & UI:** Tailwind CSS v4, Shadcn UI (Radix)
- **Estado y Formularios:** Zustand, React Hook Form, Zod
- **Visualización:** Recharts, Lucide Icons

### ⚙️ Backend
- **Framework Core:** FastAPI
- **Lenguaje:** Python 3.11+
- **Procesamiento Analítico:** Pandas, OpenPyXL

### 🗄️ Base de Datos
- **Motor:** PostgreSQL 15+
- **ORM & Migraciones:** SQLAlchemy, Alembic

---

## ⚙️ Instalación Local

### 1. Requisitos Previos
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+

### 2. Configuración del Backend

```bash
cd backend
python -m venv venv

# Activar entorno (Windows)
source venv/Scripts/activate
# Activar entorno (Mac/Linux)
# source venv/bin/activate

pip install -r requirements.txt
```

Crea un archivo `.env` en `backend/`:
```env
DATABASE_URL=postgresql://usuario:password@localhost/kardex_db
CORS_ORIGINS=http://localhost:5173
```

Ejecuta migraciones y el servidor:
```bash
alembic upgrade head
uvicorn app.main:app --reload
```

### 3. Configuración del Frontend

```bash
cd frontend
npm install
```

Crea un archivo `.env` en `frontend/`:
```env
VITE_API_URL=http://localhost:8000
```

Ejecuta el servidor de desarrollo:
```bash
npm run dev
```
