import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const classesRouter = Router();

async function getSchoolId(): Promise<string> {
  const school = await prisma.schoolConfig.findFirst();
  if (!school) throw new Error("Configurez d'abord l'établissement (Étape 1).");
  return school.id;
}

// --- Niveaux -----------------------------------------------------------

classesRouter.get("/levels", async (_req, res, next) => {
  try {
    const schoolId = await getSchoolId();
    const levels = await prisma.level.findMany({
      where: { schoolId },
      include: { classes: true, subjects: { include: { subject: true } } },
      orderBy: { name: "asc" },
    });
    res.json(levels);
  } catch (err) {
    next(err);
  }
});

const levelSchema = z.object({ name: z.string().min(1) });

classesRouter.post("/levels", async (req, res, next) => {
  try {
    const { name } = levelSchema.parse(req.body);
    const schoolId = await getSchoolId();
    const level = await prisma.level.create({ data: { schoolId, name } });
    res.status(201).json(level);
  } catch (err) {
    next(err);
  }
});

classesRouter.delete("/levels/:id", async (req, res, next) => {
  try {
    await prisma.level.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

const restDaysSchema = z.object({
  restDays: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      period: z.enum(["full", "morning", "afternoon"]),
    })
  ),
});

/**
 * Met à jour les jours (ou demi-journées) de repos d'un niveau, ex: le
 * mercredi après-midi les 1AC n'ont pas cours. Pris en compte par le moteur
 * de génération, qui n'y placera aucune séance pour ce niveau.
 */
classesRouter.put("/levels/:id/rest-days", async (req, res, next) => {
  try {
    const { restDays } = restDaysSchema.parse(req.body);
    const level = await prisma.level.update({
      where: { id: req.params.id },
      data: { restDays },
    });
    res.json(level);
  } catch (err) {
    next(err);
  }
});

// --- Classes -------------------------------------------------------------

classesRouter.get("/", async (_req, res, next) => {
  try {
    const schoolId = await getSchoolId();
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: { level: true, teacherAssignments: { include: { teacher: true } } },
      orderBy: { name: "asc" },
    });
    res.json(classes);
  } catch (err) {
    next(err);
  }
});

const classSchema = z.object({
  name: z.string().min(1),
  levelId: z.string(),
  studentCount: z.number().int().min(0).optional(),
});

classesRouter.post("/", async (req, res, next) => {
  try {
    const data = classSchema.parse(req.body);
    const schoolId = await getSchoolId();
    const created = await prisma.class.create({ data: { ...data, schoolId } });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

classesRouter.put("/:id", async (req, res, next) => {
  try {
    const data = classSchema.partial().parse(req.body);
    const updated = await prisma.class.update({ where: { id: req.params.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

classesRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.class.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
