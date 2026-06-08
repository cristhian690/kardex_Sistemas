from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from decimal import Decimal
from datetime import date
import io

# Ajusta estos imports a la ubicación real de tus modelos
from app.models.movimiento import Movimiento
from app.models.producto   import Producto
from app.models.empresa    import Empresa


# ─── Colores corporativos ───────────────────────────────────────────────────
AZUL_OSCURO  = colors.HexColor("#1e3a5f")
AZUL_MEDIO   = colors.HexColor("#2563eb")
AZUL_CLARO   = colors.HexColor("#dbeafe")
GRIS_HEADER  = colors.HexColor("#f1f5f9")
GRIS_LINEA   = colors.HexColor("#e2e8f0")
ROJO_ALERTA  = colors.HexColor("#dc2626")
VERDE        = colors.HexColor("#16a34a")
BLANCO       = colors.white


def _fmt(valor) -> str:
    """Formatea Decimal/float con 2 decimales y separador de miles."""
    try:
        return f"{float(valor):,.2f}"
    except Exception:
        return "0.00"


class ReporteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Consulta principal ─────────────────────────────────────────────────
    async def _obtener_datos(
        self,
        procesamiento_id: int,
        empresa_id:       int | None,
        fecha_desde:      str | None,
        fecha_hasta:      str | None,
    ) -> dict:
        """
        Retorna un dict:
        {
            empresa_id: {
                "empresa": Empresa,
                "productos": {
                    producto_id: {
                        "producto": Producto,
                        "movimientos": [Movimiento, ...]
                    }
                }
            }
        }
        """
        stmt = (
            select(Movimiento)
            .where(Movimiento.procesamiento_id == procesamiento_id)
            .options(
                selectinload(Movimiento.producto).selectinload(Producto.empresa)
            )
            .order_by(Movimiento.fecha)
        )

        if fecha_desde:
            stmt = stmt.where(Movimiento.fecha >= date.fromisoformat(fecha_desde))
        if fecha_hasta:
            stmt = stmt.where(Movimiento.fecha <= date.fromisoformat(fecha_hasta))
        if empresa_id:
            stmt = stmt.join(Producto).where(Producto.empresa_id == empresa_id)

        result      = await self.db.execute(stmt)
        movimientos = result.scalars().all()

        agrupado: dict = {}
        for mov in movimientos:
            prod    = mov.producto
            empresa = prod.empresa
            eid     = empresa.id
            pid     = prod.id

            if eid not in agrupado:
                agrupado[eid] = {"empresa": empresa, "productos": {}}
            if pid not in agrupado[eid]["productos"]:
                agrupado[eid]["productos"][pid] = {"producto": prod, "movimientos": []}

            agrupado[eid]["productos"][pid]["movimientos"].append(mov)

        return agrupado

    # ── Generador de PDF ───────────────────────────────────────────────────
    async def generar_pdf(
        self,
        procesamiento_id: int,
        empresa_id:       int | None = None,
        fecha_desde:      str | None = None,
        fecha_hasta:      str | None = None,
    ) -> bytes:
        datos  = await self._obtener_datos(procesamiento_id, empresa_id, fecha_desde, fecha_hasta)
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize      = landscape(A4),
            leftMargin    = 1.5 * cm,
            rightMargin   = 1.5 * cm,
            topMargin     = 2 * cm,
            bottomMargin  = 1.5 * cm,
        )

        styles  = getSampleStyleSheet()
        story   = []

        # ── Estilos personalizados ──────────────────────────────────────
        estilo_titulo = ParagraphStyle(
            "titulo",
            parent    = styles["Title"],
            fontSize  = 16,
            textColor = AZUL_OSCURO,
            spaceAfter= 4,
            alignment = TA_CENTER,
        )
        estilo_subtitulo = ParagraphStyle(
            "subtitulo",
            parent    = styles["Normal"],
            fontSize  = 9,
            textColor = colors.grey,
            spaceAfter= 12,
            alignment = TA_CENTER,
        )
        estilo_empresa = ParagraphStyle(
            "empresa",
            parent    = styles["Heading1"],
            fontSize  = 11,
            textColor = BLANCO,
            spaceBefore = 0,
            spaceAfter  = 0,
            leftIndent  = 6,
        )
        estilo_producto = ParagraphStyle(
            "producto",
            parent    = styles["Heading2"],
            fontSize  = 9,
            textColor = AZUL_OSCURO,
            spaceBefore = 4,
            spaceAfter  = 2,
        )

        # ── Encabezado global ──────────────────────────────────────────
        story.append(Paragraph("SISTEMA KARDEX", estilo_titulo))
        subtitulo_txt = f"Reporte de Movimientos — Procesamiento #{procesamiento_id}"
        if fecha_desde or fecha_hasta:
            subtitulo_txt += f"   |   {fecha_desde or '...'} → {fecha_hasta or '...'}"
        story.append(Paragraph(subtitulo_txt, estilo_subtitulo))

        if not datos:
            story.append(Paragraph("No se encontraron movimientos para los filtros indicados.", styles["Normal"]))
            doc.build(story)
            return buffer.getvalue()

        # ── Columnas de la tabla de movimientos ───────────────────────
        COL_WIDTHS = [
            2.2*cm,  # Fecha
            1.4*cm,  # T.Comp
            1.8*cm,  # Serie
            2.2*cm,  # Número
            3.0*cm,  # Operación
            # Entradas (3)
            1.8*cm, 2.0*cm, 2.2*cm,
            # Salidas (3)
            1.8*cm, 2.0*cm, 2.2*cm,
            # Saldo (3)
            1.8*cm, 2.0*cm, 2.2*cm,
        ]

        HEADER_COLS = [
            "Fecha", "T.Comp", "Serie", "Número", "Operación",
            "E.Cant", "E.C.Unit", "E.C.Total",
            "S.Cant", "S.C.Unit", "S.C.Total",
            "Sdo.Cant", "Sdo.C.Unit", "Sdo.C.Total",
        ]

        STYLE_TABLA_BASE = TableStyle([
            # Encabezado
            ("BACKGROUND",  (0, 0), (-1, 0), AZUL_MEDIO),
            ("TEXTCOLOR",   (0, 0), (-1, 0), BLANCO),
            ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",    (0, 0), (-1, 0), 7),
            ("ALIGN",       (0, 0), (-1, 0), "CENTER"),
            ("BOTTOMPADDING",(0, 0),(-1, 0), 5),
            ("TOPPADDING",  (0, 0), (-1, 0), 5),
            # Cuerpo
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 1), (-1, -1), 7),
            ("ALIGN",       (0, 1), (4, -1),  "LEFT"),
            ("ALIGN",       (5, 1), (-1, -1), "RIGHT"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANCO, GRIS_HEADER]),
            ("GRID",        (0, 0), (-1, -1), 0.3, GRIS_LINEA),
            ("TOPPADDING",  (0, 1), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 1),(-1, -1), 3),
        ])

        # ── Iterar empresas ────────────────────────────────────────────
        primer_bloque = True
        for eid, bloque_empresa in datos.items():
            empresa: Empresa = bloque_empresa["empresa"]

            if not primer_bloque:
                story.append(PageBreak())
            primer_bloque = False

            # Banner empresa
            banner_txt = (
                f"EMPRESA: {empresa.nombre.upper()}     "
                f"RUC: {empresa.ruc}"
            )
            banner_tabla = Table(
                [[Paragraph(banner_txt, estilo_empresa)]],
                colWidths=[sum(COL_WIDTHS)],
            )
            banner_tabla.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), AZUL_OSCURO),
                ("TOPPADDING",    (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ]))
            story.append(banner_tabla)
            story.append(Spacer(1, 6))

            # ── Iterar productos ───────────────────────────────────────
            for pid, bloque_prod in bloque_empresa["productos"].items():
                producto: Producto        = bloque_prod["producto"]
                movs:     list[Movimiento] = bloque_prod["movimientos"]

                # Encabezado de producto
                prod_txt = (
                    f"Código: {producto.codigo}   |   "
                    f"{producto.descripcion or 'Sin descripción'}   |   "
                    f"Unidad: {producto.unidad_medida or '-'}"
                )
                story.append(Paragraph(prod_txt, estilo_producto))

                # Filas
                filas = [HEADER_COLS]
                tot_ent_cant  = Decimal(0)
                tot_ent_total = Decimal(0)
                tot_sal_cant  = Decimal(0)
                tot_sal_total = Decimal(0)

                for m in movs:
                    tot_ent_cant  += m.ent_cantidad  or 0
                    tot_ent_total += m.ent_costo_total or 0
                    tot_sal_cant  += m.sal_cantidad  or 0
                    tot_sal_total += m.sal_costo_total or 0

                    filas.append([
                        str(m.fecha),
                        str(m.tipo_comprobante),
                        m.serie,
                        m.numero,
                        m.tipo_operacion,
                        _fmt(m.ent_cantidad),
                        _fmt(m.ent_costo_unit),
                        _fmt(m.ent_costo_total),
                        _fmt(m.sal_cantidad),
                        _fmt(m.sal_costo_unit),
                        _fmt(m.sal_costo_total),
                        _fmt(m.saldo_cantidad),
                        _fmt(m.saldo_costo_unit),
                        _fmt(m.saldo_costo_total),
                    ])

                # Fila totales
                fila_total = [
                    "TOTAL", "", "", "", "",
                    _fmt(tot_ent_cant), "", _fmt(tot_ent_total),
                    _fmt(tot_sal_cant), "", _fmt(tot_sal_total),
                    "", "", "",
                ]
                filas.append(fila_total)

                tabla = Table(filas, colWidths=COL_WIDTHS, repeatRows=1)

                # Estilo base + totales
                estilo_final = TableStyle(STYLE_TABLA_BASE._cmds + [
                    ("BACKGROUND",  (0, -1), (-1, -1), AZUL_CLARO),
                    ("FONTNAME",    (0, -1), (-1, -1), "Helvetica-Bold"),
                    ("FONTSIZE",    (0, -1), (-1, -1), 7),
                    ("TEXTCOLOR",   (0, -1), (-1, -1), AZUL_OSCURO),
                ])
                tabla.setStyle(estilo_final)

                story.append(tabla)
                story.append(Spacer(1, 10))

        doc.build(story)
        return buffer.getvalue()