import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/* =========================================================
   TOUR LOGIC
   ========================================================= */

export function runGuidedTour(force = false) {
  if (!force) {
    const isCompleted = localStorage.getItem("kardex_tour_completed");
    if (isCompleted === "true") return;
  }

  const driverObj = driver({
    showProgress: true,
    animate: true,
    nextBtnText: "Continuar",
    prevBtnText: "Atrás",
    doneBtnText: "Comenzar",
    progressText: "Paso {{current}} de {{total}}",

    onDestroyStarted: () => {
      if (
        !driverObj.hasNextStep() ||
        confirm(
          "¿Deseas finalizar el recorrido? Podrás volver a iniciarlo desde el Centro de Ayuda cuando quieras."
        )
      ) {
        localStorage.setItem("kardex_tour_completed", "true");
        driverObj.destroy();
      }
    },

    steps: [
      {
        popover: {
          title: "Bienvenido al Sistema Kardex 👋",
          description:
            "Este recorrido te mostrará los pasos principales para cargar información, procesar tus archivos y revisar los resultados obtenidos.",
          side: "left",
          align: "start",
        },
      },
      {
        element: "#tour-empresa",
        popover: {
          title: "Selecciona una Empresa (Opcional)",
          description:
            "Puedes seleccionar la empresa a la que pertenecen los movimientos que vas a procesar. Si no estás seguro, puedes dejar este campo sin asignar y gestionarlo posteriormente desde el módulo de Empresas y Productos.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-saldo-inicial",
        popover: {
          title: "Paso 1: Registrar Saldo Inicial",
          description:
            "Carga tu inventario inicial si lo tienes. Es opcional pero recomendado.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-upload-movimientos",
        popover: {
          title: "Paso 2: Cargar Movimientos",
          description:
            "Sube archivos Excel con compras, ventas o devoluciones.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: "#tour-procesar",
        popover: {
          title: "Paso 3: Procesar Información",
          description:
            "El sistema calculará automáticamente el Kardex.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#tour-help-center",
        popover: {
          title: "Centro de Ayuda",
          description:
            "Puedes volver a este recorrido cuando lo necesites.",
          side: "right",
          align: "start",
        },
      },
      {
        popover: {
          title: "¡Todo listo! 🚀",
          description:
            "Ya puedes comenzar a usar el sistema.",
          side: "left",
          align: "center",
        },
      },
    ],
  });

  driverObj.drive();
}

/* =========================================================
   AUTO INIT COMPONENT
   ========================================================= */

export function GuidedTourInit() {
  useEffect(() => {
    const timeout = setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const startTour = searchParams.get("startTour") === "true";
      if (startTour) {
        // Limpiamos el parámetro de la URL sin recargar la página
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        runGuidedTour(true);
      } else {
        runGuidedTour(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, []);

  return <DriverCustomStyles />;
}

function DriverCustomStyles() {
  return (
    <style>{`
      .driver-popover {
        background-color: var(--popover) !important;
        color: var(--popover-foreground) !important;
        border-radius: var(--radius-lg) !important;
        border: 1px solid var(--border) !important;
        padding: 1.25rem !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
          0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
        font-family: var(--font-sans) !important;
        max-width: 340px !important;
      }

      .driver-popover,
      .driver-popover * {
        font-family: var(--font-sans) !important;
      }

      .dark .driver-popover {
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5),
          0 8px 10px -6px rgba(0, 0, 0, 0.5) !important;
      }

      .driver-popover-title {
        color: var(--foreground) !important;
        font-size: 1.05rem !important;
        font-weight: 600 !important;
        margin-bottom: 0.5rem !important;
      }

      .driver-popover-description {
        color: var(--muted-foreground) !important;
        font-size: 0.875rem !important;
        line-height: 1.5 !important;
      }

      .driver-popover-footer {
        margin-top: 1rem !important;
        padding-top: 0.75rem !important;
        border-top: 1px solid var(--border) !important;
        display: flex !important;
        justify-content: space-between !important;
      }

      .driver-popover-footer button {
        font-size: 0.8rem !important;
        padding: 0.35rem 0.75rem !important;
        border-radius: var(--radius-md) !important;
        border: 1px solid var(--border) !important;
        cursor: pointer !important;
      }

      .driver-popover-footer .driver-popover-next-btn,
      .driver-popover-footer .driver-popover-done-btn {
        background-color: var(--primary) !important;
        color: var(--primary-foreground) !important;
        border-color: transparent !important;
      }

      .driver-popover-footer .driver-popover-prev-btn {
        background-color: var(--secondary) !important;
        color: var(--secondary-foreground) !important;
      }

      .driver-popover-arrow {
        border-color: var(--popover) !important;
      }
    `}</style>
  );
}