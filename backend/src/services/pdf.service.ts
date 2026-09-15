import PDFDocument from "pdfkit";
import { TimetableCell } from "./excel.service";

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const NAVY = "#1E2A44";
const GOLD = "#C08A2E";
const BORDER = "#D9DCE3";

/**
 * Construit un PDF professionnel représentant une grille d'emploi du temps.
 */
export function buildTimetablePdf(params: {
  title: string;
  subtitle?: string;
  slotRows: { order: number; startTime: string; endTime: string }[];
  workDays: number[];
  cells: TimetableCell[];
}): Promise<Buffer> {
  const { title, subtitle, slotRows, workDays, cells } = params;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor(NAVY).fontSize(20).font("Helvetica-Bold").text(title, { align: "center" });
    if (subtitle) {
      doc.moveDown(0.2);
      doc.fillColor("#666666").fontSize(11).font("Helvetica-Oblique").text(subtitle, {
        align: "center",
      });
    }
    doc.moveDown(1);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const timeColWidth = 90;
    const dayColWidth = (pageWidth - timeColWidth) / workDays.length;
    const headerHeight = 26;
    const rowHeight = 34;
    const startX = doc.page.margins.left;
    let y = doc.y;

    // En-tête
    doc.font("Helvetica-Bold").fontSize(10);
    doc.rect(startX, y, timeColWidth, headerHeight).fill(NAVY);
    doc.fillColor("#FFFFFF").text("Heure", startX, y + 8, {
      width: timeColWidth,
      align: "center",
    });
    workDays.forEach((d, i) => {
      const x = startX + timeColWidth + i * dayColWidth;
      doc.rect(x, y, dayColWidth, headerHeight).fill(NAVY);
      doc.fillColor("#FFFFFF").text(DAY_NAMES[d] ?? `Jour ${d}`, x, y + 8, {
        width: dayColWidth,
        align: "center",
      });
    });
    y += headerHeight;

    const cellMap = new Map<string, TimetableCell>();
    for (const c of cells) cellMap.set(`${c.dayOfWeek}::${c.order}`, c);

    doc.font("Helvetica").fontSize(9);
    for (const slot of slotRows) {
      // gestion simple du saut de page
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ size: "A4", layout: "landscape", margin: 36 });
        y = doc.page.margins.top;
      }

      doc.rect(startX, y, timeColWidth, rowHeight).strokeColor(BORDER).stroke();
      doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(9).text(
        `${slot.startTime} - ${slot.endTime}`,
        startX,
        y + 12,
        { width: timeColWidth, align: "center" }
      );

      workDays.forEach((d, i) => {
        const x = startX + timeColWidth + i * dayColWidth;
        const content = cellMap.get(`${d}::${slot.order}`);
        doc.rect(x, y, dayColWidth, rowHeight).strokeColor(BORDER).stroke();
        if (content) {
          doc.save();
          doc.rect(x + 1, y + 1, dayColWidth - 2, rowHeight - 2).fill(
            content.subjectColor ?? GOLD
          );
          doc.fillOpacity(1).fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9).text(
            content.label,
            x + 4,
            y + 10,
            { width: dayColWidth - 8, align: "center" }
          );
          doc.restore();
        }
      });

      y += rowHeight;
    }

    doc.end();
  });
}
