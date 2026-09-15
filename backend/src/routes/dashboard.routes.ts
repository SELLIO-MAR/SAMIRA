import { Router } from "express";
import { prisma } from "../db";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", async (_req, res, next) => {
  try {
    const school = await prisma.schoolConfig.findFirst();
    if (!school) {
      return res.json({
        teacherCount: 0,
        classCount: 0,
        totalWeeklyHours: 0,
        bySubject: [],
        byLevel: [],
        lastRun: null,
      });
    }

    const [teacherCount, classCount, requirements, teachers, classes, lastRun] =
      await Promise.all([
        prisma.teacher.count({ where: { schoolId: school.id } }),
        prisma.class.count({ where: { schoolId: school.id } }),
        prisma.subjectRequirement.findMany({
          include: { subject: true, level: { include: { classes: true } } },
        }),
        prisma.teacher.findMany({ where: { schoolId: school.id } }),
        prisma.class.count({ where: { schoolId: school.id } }),
        prisma.timetableRun.findFirst({
          where: { schoolId: school.id },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Heures totales hebdomadaires réellement enseignées = somme(heures matière x nb classes du niveau)
    let totalWeeklyHours = 0;
    const bySubjectMap = new Map<string, number>();
    const byLevelMap = new Map<string, number>();

    for (const req of requirements) {
      const nbClasses = req.level.classes.length;
      const hours = req.weeklyHours * nbClasses;
      totalWeeklyHours += hours;
      bySubjectMap.set(req.subject.name, (bySubjectMap.get(req.subject.name) ?? 0) + hours);
      byLevelMap.set(req.level.id, (byLevelMap.get(req.level.id) ?? 0) + hours);
    }

    const levels = await prisma.level.findMany({ where: { schoolId: school.id } });
    const levelNameMap = new Map(levels.map((l) => [l.id, l.name]));

    res.json({
      teacherCount,
      classCount,
      totalWeeklyHours,
      bySubject: [...bySubjectMap.entries()].map(([name, hours]) => ({ name, hours })),
      byLevel: [...byLevelMap.entries()].map(([levelId, hours]) => ({
        name: levelNameMap.get(levelId) ?? levelId,
        hours,
      })),
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            score: lastRun.score,
            unresolvedCount: lastRun.unresolvedCount,
            createdAt: lastRun.createdAt,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});
