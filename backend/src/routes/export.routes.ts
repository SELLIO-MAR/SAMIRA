import { Router } from "express";
import { prisma } from "../db";
import { buildTimetableExcel, TimetableCell } from "../services/excel.service";
import { buildTimetablePdf } from "../services/pdf.service";

export const exportRouter = Router();

async function getLatestRunId(): Promise<string | null> {
  const school = await prisma.schoolConfig.findFirst();
  if (!school) return null;
  const run = await prisma.timetableRun.findFirst({
    where: { schoolId: school.id },
    orderBy: { createdAt: "desc" },
  });
  return run?.id ?? null;
}

async function getSlotRows() {
  const school = await prisma.schoolConfig.findFirst({
    include: { workDays: { include: { slots: true }, orderBy: { dayOfWeek: "asc" } } },
  });
  if (!school) return { workDays: [] as number[], slotRows: [] as any[] };

  const workDays = school.workDays.map((w) => w.dayOfWeek);
  // Union de tous les créneaux (ordre + horaires) toutes journées confondues,
  // pour construire les lignes du tableau même si les jours ont des durées différentes.
  const rowMap = new Map<number, { order: number; startTime: string; endTime: string }>();
  for (const wd of school.workDays) {
    for (const s of wd.slots) {
      if (!rowMap.has(s.order)) {
        rowMap.set(s.order, { order: s.order, startTime: s.startTime, endTime: s.endTime });
      }
    }
  }
  const slotRows = [...rowMap.values()].sort((a, b) => a.order - b.order);
  return { workDays, slotRows };
}

async function buildClassCells(runId: string, classId: string): Promise<TimetableCell[]> {
  const sessions = await prisma.session.findMany({
    where: { runId, classId },
    include: { timeSlot: true },
  });
  const subjects = await prisma.subject.findMany();
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return sessions.map((s) => {
    const subject = subjectMap.get(s.subjectId);
    return {
      dayOfWeek: s.dayOfWeek,
      order: s.timeSlot.order,
      startTime: s.timeSlot.startTime,
      endTime: s.timeSlot.endTime,
      label: subject?.name ?? "",
      subjectColor: subject?.colorHex,
    };
  });
}

async function buildTeacherCells(runId: string, teacherId: string): Promise<TimetableCell[]> {
  const sessions = await prisma.session.findMany({
    where: { runId, teacherId },
    include: { timeSlot: true, class: true },
  });
  const subjects = await prisma.subject.findMany();
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  return sessions.map((s) => {
    const subject = subjectMap.get(s.subjectId);
    return {
      dayOfWeek: s.dayOfWeek,
      order: s.timeSlot.order,
      startTime: s.timeSlot.startTime,
      endTime: s.timeSlot.endTime,
      label: `${subject?.name ?? ""} — ${s.class.name}`,
      subjectColor: subject?.colorHex,
    };
  });
}

exportRouter.get("/class/:classId/pdf", async (req, res, next) => {
  try {
    const runId = await getLatestRunId();
    if (!runId) return res.status(400).json({ error: "Aucun emploi du temps généré." });
    const cls = await prisma.class.findUnique({ where: { id: req.params.classId } });
    const { workDays, slotRows } = await getSlotRows();
    const cells = await buildClassCells(runId, req.params.classId);

    const pdf = await buildTimetablePdf({
      title: `Emploi du temps — ${cls?.name ?? ""}`,
      slotRows,
      workDays,
      cells,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="emploi_du_temps_${cls?.name}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

exportRouter.get("/class/:classId/excel", async (req, res, next) => {
  try {
    const runId = await getLatestRunId();
    if (!runId) return res.status(400).json({ error: "Aucun emploi du temps généré." });
    const cls = await prisma.class.findUnique({ where: { id: req.params.classId } });
    const { workDays, slotRows } = await getSlotRows();
    const cells = await buildClassCells(runId, req.params.classId);

    const excel = await buildTimetableExcel({
      title: `Emploi du temps — ${cls?.name ?? ""}`,
      slotRows,
      workDays,
      cells,
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="emploi_du_temps_${cls?.name}.xlsx"`);
    res.send(excel);
  } catch (err) {
    next(err);
  }
});

exportRouter.get("/teacher/:teacherId/pdf", async (req, res, next) => {
  try {
    const runId = await getLatestRunId();
    if (!runId) return res.status(400).json({ error: "Aucun emploi du temps généré." });
    const teacher = await prisma.teacher.findUnique({ where: { id: req.params.teacherId } });
    const { workDays, slotRows } = await getSlotRows();
    const cells = await buildTeacherCells(runId, req.params.teacherId);

    const pdf = await buildTimetablePdf({
      title: `Emploi du temps — ${teacher?.fullName ?? ""}`,
      slotRows,
      workDays,
      cells,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="emploi_du_temps_${teacher?.fullName}.pdf"`
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

exportRouter.get("/teacher/:teacherId/excel", async (req, res, next) => {
  try {
    const runId = await getLatestRunId();
    if (!runId) return res.status(400).json({ error: "Aucun emploi du temps généré." });
    const teacher = await prisma.teacher.findUnique({ where: { id: req.params.teacherId } });
    const { workDays, slotRows } = await getSlotRows();
    const cells = await buildTeacherCells(runId, req.params.teacherId);

    const excel = await buildTimetableExcel({
      title: `Emploi du temps — ${teacher?.fullName ?? ""}`,
      slotRows,
      workDays,
      cells,
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="emploi_du_temps_${teacher?.fullName}.xlsx"`
    );
    res.send(excel);
  } catch (err) {
    next(err);
  }
});
