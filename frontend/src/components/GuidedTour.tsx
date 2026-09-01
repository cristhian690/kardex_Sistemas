import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useConfirm } from "@/context/confirm-context";

/* =========================================================
   TOUR LOGIC
   ========================================================= */

const TOUR_STORAGE_KEY = "kardex_tour_completed";

type ConfirmFn = (options: { title?: string, description: string, confirmText?: string, cancelText?: string, variant?: 'default' | 'destructive' }) => Promise<boolean>;

export function runGuidedTour(force = false, confirmFn?: ConfirmFn, startIndex = 0) {
  if (typeof window === "undefined") return;

  if (!force) {
    const isCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
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
      if (!driverObj.hasNextStep()) {
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
        driverObj.destroy();
        return;
      }
      
      // Guardamos el paso actual
      const currentIndex = driverObj.getActiveIndex ? driverObj.getActiveIndex() : 0;
      
      if (confirmFn) {
        // Destruimos el tour temporalmente para liberar los eventos de clic del DOM
        driverObj.destroy();
        
        confirmFn({
          title: "Finalizar recorrido",
          description: "¿Deseas finalizar el recorrido? Podrás volver a iniciarlo desde el Centro de Ayuda cuando quieras.",
          confirmText: "Finalizar",
          cancelText: "Continuar",
        }).then((isConfirmed) => {
          if (isConfirmed) {
            localStorage.setItem(TOUR_STORAGE_KEY, "true");
          } else {
            // Si el usuario cancela, reanudamos el tour exactamente donde se quedó
            runGuidedTour(true, confirmFn, currentIndex);
          }
        });
      } else {
        if (
          confirm(
            "¿Deseas finalizar el recorrido? Podrás volver a iniciarlo desde el Centro de Ayuda cuando quieras."
          )
        ) {
          localStorage.setItem(TOUR_STORAGE_KEY, "true");
          driverObj.destroy();
        }
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

  driverObj.drive(startIndex);
}

/* =========================================================
   AUTO INIT COMPONENT
   ========================================================= */

export function GuidedTourInit() {
  const { confirm } = useConfirm();

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const timeout = setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const startTour = searchParams.get("startTour") === "true";
      if (startTour) {
        // Limpiamos el parámetro de la URL sin recargar la página
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
        runGuidedTour(true, confirm);
      } else {
        runGuidedTour(false, confirm);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [confirm]);

  return <DriverCustomStyles />;
}

function DriverCustomStyles() {
  return (
    <style>{`
      /* Animación de entrada suave y premium */
      @keyframes driverPopIn {
        0% { opacity: 0; transform: scale(0.97) translateY(8px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }

      .driver-popover {
        /* Se usa var() directo porque las variables globales usan la función oklch() */
        background-color: var(--popover) !important;
        color: var(--popover-foreground) !important;
        border-radius: var(--radius-lg) !important;
        border: 1px solid var(--border) !important;
        padding: 1.25rem !important;
        
        /* Sombra más profunda y difuminada */
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15),
          0 10px 20px -5px rgba(0, 0, 0, 0.1) !important;
        
        font-family: var(--font-sans) !important;
        max-width: 350px !important;
        animation: driverPopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      }

      .driver-popover * {
        font-family: var(--font-sans) !important;
      }

      .dark .driver-popover {
        background-color: var(--popover) !important;
        box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.7),
          0 10px 20px -5px rgba(0, 0, 0, 0.5) !important;
        border: 1px solid var(--border) !important;
      }

      .driver-popover-title {
        color: var(--foreground) !important;
        font-size: 1.1rem !important;
        font-weight: 600 !important;
        margin-bottom: 0.6rem !important;
        /* Tipografía más junta para un look más moderno */
        letter-spacing: -0.015em !important; 
      }

      .driver-popover-description {
        color: var(--muted-foreground) !important;
        font-size: 0.875rem !important;
        line-height: 1.6 !important;
      }

      .driver-popover-footer {
        margin-top: 1.25rem !important;
        padding-top: 1rem !important;
        border-top: 1px solid var(--border) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }

      .driver-popover-footer button {
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        padding: 0.4rem 0.875rem !important;
        border-radius: var(--radius-md) !important;
        border: 1px solid var(--border) !important;
        cursor: pointer !important;
        /* Transición para los hover states */
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      /* Micro-interacciones: Hover de botones primarios */
      .driver-popover-footer .driver-popover-next-btn,
      .driver-popover-footer .driver-popover-done-btn {
        background-color: var(--primary) !important;
        color: var(--primary-foreground) !important;
        border-color: transparent !important;
      }

      .driver-popover-footer .driver-popover-next-btn:hover,
      .driver-popover-footer .driver-popover-done-btn:hover {
        opacity: 0.9 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      }

      .dark .driver-popover-footer .driver-popover-next-btn:hover,
      .dark .driver-popover-footer .driver-popover-done-btn:hover {
         box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1) !important;
      }

      /* Hover de botón secundario (Atrás) */
      .driver-popover-footer .driver-popover-prev-btn {
        background-color: transparent !important;
        color: var(--foreground) !important;
        border-color: var(--border) !important;
      }

      .driver-popover-footer .driver-popover-prev-btn:hover {
        background-color: var(--secondary) !important;
        color: var(--secondary-foreground) !important;
      }

      /* Indicador de progreso como "Píldora" */
      .driver-popover-progress-text {
        font-size: 0.75rem !important;
        font-weight: 500 !important;
        color: var(--muted-foreground) !important;
        background-color: var(--secondary) !important;
        padding: 0.2rem 0.6rem !important;
        border-radius: 9999px !important; /* Forma redondeada completa */
      }

      .driver-popover-arrow {
        border-color: var(--popover) !important;
      }
    `}</style>
  );
}