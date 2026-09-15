import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const teachersRouter = Router();

async function getSchoolId(): Promise<string> {
  const school = await prisma.schoolConfig.findFirst();
  if (!school) throw new Error("Configurez d'abord l'établissement (Étape 1).");
  return school.id;
}

teachersRouter.get("/", async (_req, res, next) => {
  try {
    const schoolId = await getSchoolId();
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      include: {
        subject: true,
        availabilities: true,
        assignments: { include: { class: true } },
      },
      orderBy: { fullName: "asc" },
    });
    res.json(teachers);
  } catch (err) {
    next(err);
  }
});

const availabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  isAvailable: z.boolean().default(true),
});

const teacherSchema = z.object({
  fullName: z.string().min(1),
  subjectId: z.string(),
  weeklyHours: z.number().int().min(0).max(40).default(0),
  classIds: z.array(z.string()).default([]),
  availabilities: z.array(availabilitySchema).default([]),
});

teachersRouter.post("/", async (req, res, next) => {
  try {
    const data = teacherSchema.parse(req.body);
    const schoolId = await getSchoolId();

    const teacher = await prisma.teacher.create({
      data: {
        schoolId,
        fullName: data.fullName,
        subjectId: data.subjectId,
        weeklyHours: data.weeklyHours,
        assignments: { create: data.classIds.map((classId) => ({ classId })) },
        availabilities: { create: data.availabilities },
      },
      include: { subject: true, assignments: { include: { class: true } }, availabilities: true },
    });

    res.status(201).json(teacher);
  } catch (err) {
    next(err);
  }
});

teachersRouter.put("/:id", async (req, res, next) => {
  try {
    const data = teacherSchema.partial().parse(req.body);
    const { classIds, availabilities, ...rest } = data;

    await prisma.teacher.update({ where: { id: req.params.id }, data: rest });

    if (classIds) {
      await prisma.teacherAssignment.deleteMany({ where: { teacherId: req.params.id } });
      await prisma.teacherAssignment.createMany({
        data: classIds.map((classId) => ({ teacherId: req.params.id, classId })),
      });
    }

    if (availabilities) {
      await prisma.teacherAvailability.deleteMany({ where: { teacherId: req.params.id } });
      await prisma.teacherAvailability.createMany({
        data: availabilities.map((a) => ({ ...a, teacherId: req.params.id })),
      });
    }

    const updated = await prisma.teacher.findUnique({
      where: { id: req.params.id },
      include: { subject: true, assignments: { include: { class: true } }, availabilities: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

teachersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.teacher.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
