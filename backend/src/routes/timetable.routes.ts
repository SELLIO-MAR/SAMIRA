import { Router } from "express";
import { prisma } from "../db";
import { generateTimetable } from "../services/scheduler.service";
import { SlotRef, AvailabilityWindow, SchedulableUnit, RestDay, AFTERNOON_THRESHOLD } from "../types";

export const timetableRouter = Router();

/**
 * Lance le moteur de génération automatique pour l'ensemble de l'établissement.
 * Construit les unités à placer (une par heure hebdomadaire requise),
 * résout le CSP, puis persiste le résultat comme un nouveau "TimetableRun".
 */
timetableRouter.post("/generate", async (_req, res, next) => {
  try {
    const school = await prisma.schoolConfig.findFirst({
      include: { workDays: { include: { slots: true } } },
    });
    if (!school) {
      return res.status(400).json({ error: "Configurez d'abord l'établissement (Étape 1)." });
    }

    const slots: SlotRef[] = school.workDays.flatMap((wd) =>
      wd.slots.map((s) => ({
        id: s.id,
        dayOfWeek: wd.dayOfWeek,
        order: s.order,
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );

    if (slots.length === 0) {
      return res
        .status(400)
        .json({ error: "Aucun créneau horaire défini. Complétez l'Étape 1." });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      include: {
        level: { include: { subjects: { include: { subject: true } } } },
        teacherAssignments: { include: { teacher: { include: { subject: true } } } },
      },
    });

    // Pour chaque classe, calculer les créneaux interdits à partir des jours
    // (ou demi-journées) de repos déclarés sur son niveau (Étape 2 / Étape 1).
    const classBlockedSlots = new Map<string, Set<string>>();
    for (const cls of classes) {
      const restDays = (cls.level.restDays as unknown as RestDay[]) ?? [];
      if (restDays.length === 0) continue;
      const blocked = new Set<string>();
      for (const rest of restDays) {
        for (const slot of slots) {
          if (slot.dayOfWeek !== rest.dayOfWeek) continue;
          const isMorning = slot.startTime < AFTERNOON_THRESHOLD;
          if (
            rest.period === "full" ||
            (rest.period === "morning" && isMorning) ||
            (rest.period === "afternoon" && !isMorning)
          ) {
            blocked.add(slot.id);
          }
        }
      }
      classBlockedSlots.set(cls.id, blocked);
    }

    const teachers = await prisma.teacher.findMany({
      where: { schoolId: school.id },
      include: { availabilities: true },
    });

    const availabilityMap = new Map<string, AvailabilityWindow[]>();
    for (const t of teachers) {
      availabilityMap.set(
        t.id,
        t.availabilities.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isAvailable: a.isAvailable,
        }))
      );
    }

    // Construire la liste des unités à placer : pour chaque classe, pour
    // chaque matière requise par son niveau, on cherche le professeur qui
    // enseigne cette matière ET qui est affecté à cette classe.
    const units: SchedulableUnit[] = [];
    const missingAssignments: string[] = [];

    for (const cls of classes) {
      for (const req of cls.level.subjects) {
        const assignment = cls.teacherAssignments.find(
          (a) => a.teacher.subjectId === req.subjectId
        );
        if (!assignment) {
          missingAssignments.push(
            `${cls.name} — ${req.subject.name} (aucun professeur affecté)`
          );
          continue;
        }
        for (let i = 0; i < req.weeklyHours; i++) {
          units.push({
            key: `${cls.id}::${req.subjectId}::${assignment.teacherId}::${i}`,
            classId: cls.id,
            className: cls.name,
            subjectId: req.subjectId,
            subjectName: req.subject.name,
            teacherId: assignment.teacherId,
            teacherName: assignment.teacher.fullName,
          });
        }
      }
    }

    if (units.length === 0) {
      return res.status(400).json({
        error:
          "Aucune séance à générer. Vérifiez les volumes horaires par niveau et les affectations professeur ↔ classe.",
        missingAssignments,
      });
    }

    const result = generateTimetable({
      slots,
      units,
      teacherAvailability: availabilityMap,
      maxSessionsPerDayPerClass: school.maxSessionsPerDay,
      maxSubjectHoursPerDayPerClass: school.maxSubjectHoursPerDay,
      classBlockedSlots,
    });

    const run = await prisma.timetableRun.create({
      data: {
        schoolId: school.id,
        status: result.status,
        score: result.score,
        unresolvedCount: result.unresolved.length,
        sessions: {
          create: result.placed.map((p) => ({
            classId: p.classId,
            teacherId: p.teacherId,
            subjectId: p.subjectId,
            timeSlotId: p.timeSlotId,
            dayOfWeek: p.dayOfWeek,
          })),
        },
      },
      include: { sessions: true },
    });

    res.status(201).json({
      runId: run.id,
      status: run.status,
      score: run.score,
      placedCount: result.placed.length,
      unresolved: result.unresolved.map((u) => ({
        classe: u.className,
        matiere: u.subjectName,
        professeur: u.teacherName,
      })),
      missingAssignments,
    });
  } catch (err) {
    next(err);
  }
});

/** Dernière génération réalisée pour l'établissement */
async function getLatestRun() {
  const school = await prisma.schoolConfig.findFirst();
  if (!school) return null;
  return prisma.timetableRun.findFirst({
    where: { schoolId: school.id },
    orderBy: { createdAt: "desc" },
  });
}

timetableRouter.get("/latest", async (_req, res, next) => {
  try {
    const run = await getLatestRun();
    res.json(run);
  } catch (err) {
    next(err);
  }
});

/** Emploi du temps d'une classe (dernière génération) */
timetableRouter.get("/class/:classId", async (req, res, next) => {
  try {
    const run = await getLatestRun();
    if (!run) return res.json({ sessions: [] });

    const sessions = await prisma.session.findMany({
      where: { runId: run.id, classId: req.params.classId },
      include: { teacher: true, timeSlot: true },
    });
    const subjects = await prisma.subject.findMany();
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    res.json({
      runId: run.id,
      sessions: sessions.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        order: s.timeSlot.order,
        startTime: s.timeSlot.startTime,
        endTime: s.timeSlot.endTime,
        subjectId: s.subjectId,
        subjectName: subjectMap.get(s.subjectId)?.name ?? "",
        subjectColor: subjectMap.get(s.subjectId)?.colorHex ?? "#C08A2E",
        teacherName: s.teacher.fullName,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Emploi du temps individuel d'un professeur (dernière génération) */
timetableRouter.get("/teacher/:teacherId", async (req, res, next) => {
  try {
    const run = await getLatestRun();
    if (!run) return res.json({ sessions: [] });

    const sessions = await prisma.session.findMany({
      where: { runId: run.id, teacherId: req.params.teacherId },
      include: { class: true, timeSlot: true },
    });
    const subjects = await prisma.subject.findMany();
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));

    res.json({
      runId: run.id,
      sessions: sessions.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        order: s.timeSlot.order,
        startTime: s.timeSlot.startTime,
        endTime: s.timeSlot.endTime,
        subjectId: s.subjectId,
        subjectName: subjectMap.get(s.subjectId)?.name ?? "",
        subjectColor: subjectMap.get(s.subjectId)?.colorHex ?? "#C08A2E",
        className: s.class.name,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Fiche de service (tableau de service) d'un professeur */
timetableRouter.get("/teacher/:teacherId/service", async (req, res, next) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.params.teacherId },
      include: { subject: true, assignments: { include: { class: true } } },
    });
    if (!teacher) return res.status(404).json({ error: "Professeur introuvable." });

    const run = await getLatestRun();
    const sessions = run
      ? await prisma.session.findMany({
          where: { runId: run.id, teacherId: teacher.id },
          include: { class: true, timeSlot: true },
        })
      : [];

    res.json({
      teacher: {
        id: teacher.id,
        fullName: teacher.fullName,
        subject: teacher.subject.name,
        weeklyHours: teacher.weeklyHours,
        classes: teacher.assignments.map((a) => a.class.name),
      },
      totalPlacedHours: sessions.length,
      sessions: sessions.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        order: s.timeSlot.order,
        startTime: s.timeSlot.startTime,
        endTime: s.timeSlot.endTime,
        className: s.class.name,
      })),
    });
  } catch (err) {
    next(err);
  }
});
