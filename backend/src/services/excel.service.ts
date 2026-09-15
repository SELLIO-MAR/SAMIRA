import ExcelJS from "exceljs";

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const NAVY = "1E2A44";
const GOLD = "C08A2E";

export interface TimetableCell {
  dayOfWeek: number;
  order: number;
  startTime: string;
  endTime: string;
  label: string; // ex: "Maths - 1AC-A" ou "Maths (Ahmed Benali)"
  subjectColor?: string;
}

/**
 * Construit un classeur Excel représentant une grille d'emploi du temps
 * (heures en lignes, jours en colonnes), pour un professeur ou une classe.
 */
export async function buildTimetableExcel(params: {
  title: string;
  subtitle?: string;
  slotRows: { order: number; startTime: string; endTime: string }[];
  workDays: number[]; // liste ordonnée des jours à afficher
  cells: TimetableCell[];
}): Promise<Buffer> {
  const { title, subtitle, slotRows, workDays, cells } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Plateforme de gestion scolaire";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Emploi du temps", {
    views: [{ showGridLines: false }],
  });

  sheet.mergeCells(1, 1, 1, workDays.length + 1);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 16, bold: true, color: { argb: "FF" + NAVY } };
  titleCell.alignment = { horizontal: "center" };

  let headerRowIndex = 2;
  if (subtitle) {
    sheet.mergeCells(2, 1, 2, workDays.length + 1);
    const subtitleCell = sheet.getCell(2, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { size: 11, italic: true, color: { argb: "FF666666" } };
    subtitleCell.alignment = { horizontal: "center" };
    headerRowIndex = 3;
  }

  // Ligne d'en-tête : Heure | Lundi | Mardi | ...
  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.getCell(1).value = "Heure";
  workDays.forEach((d, i) => {
    headerRow.getCell(i + 2).value = DAY_NAMES[d] ?? `Jour ${d}`;
  });
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + NAVY } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder();
  });

  sheet.getColumn(1).width = 14;
  for (let i = 0; i < workDays.length; i++) sheet.getColumn(i + 2).width = 22;

  const cellMap = new Map<string, TimetableCell>();
  for (const c of cells) cellMap.set(`${c.dayOfWeek}::${c.order}`, c);

  slotRows.forEach((slot, rowOffset) => {
    const row = sheet.getRow(headerRowIndex + 1 + rowOffset);
    row.getCell(1).value = `${slot.startTime} - ${slot.endTime}`;
    row.getCell(1).font = { bold: true };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(1).border = thinBorder();

    workDays.forEach((d, colOffset) => {
      const cell = row.getCell(colOffset + 2);
      const content = cellMap.get(`${d}::${slot.order}`);
      cell.value = content?.label ?? "";
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder();
      if (content) {
        const color = (content.subjectColor ?? GOLD).replace("#", "");
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + lighten(color) },
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function thinBorder() {
  const style: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFD9DCE3" } };
  return { top: style, left: style, bottom: style, right: style };
}

// Éclaircit légèrement une couleur hex pour un fond de cellule lisible
function lighten(hex: string): string {
  const num = parseInt(hex, 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + 130);
  const g = Math.min(255, ((num >> 8) & 0xff) + 130);
  const b = Math.min(255, (num & 0xff) + 130);
  return [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}
