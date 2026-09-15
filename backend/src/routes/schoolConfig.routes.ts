import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const schoolConfigRouter = Router();

/**
 * Retourne (en la créant si besoin) la configuration unique de l'établissement,
 * avec ses jours de travail, créneaux et pauses.
 */
schoolConfigRouter.get("/", async (_req, res, next) => {
  try {
    let school = await prisma.schoolConfig.findFirst({
      include: { workDays: { include: { slots: true, breaks: true }, orderBy: { dayOfWeek: "asc" } } },
    });
    if (!school) {
      school = await prisma.schoolConfig.create({
        data: { name: "Mon établissement" },
        include: { workDays: { include: { slots: true, breaks: true } } },
      });
    }
    res.json(school);
  } catch (err) {
    next(err);
  }
});

const workDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMin: z.number().int().min(15).max(240).default(60),
  breaks: z
    .array(z.object({ label: z.string(), startTime: z.string(), endTime: z.string() }))
    .default([]),
});

const updateSchoolSchema = z.object({
  name: z.string().min(1),
  maxSessionsPerDay: z.number().int().min(1).max(15),
  freeHalfDays: z
    .array(z.object({ dayOfWeek: z.number(), period: z.enum(["morning", "afternoon"]) }))
    .default([]),
  workDays: z.array(workDaySchema),
});

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

/** Découpe une journée en créneaux réguliers, en excluant les pauses déclarées. */
function buildSlots(
  startTime: string,
  endTime: string,
  slotDurationMin: number,
  breaks: { startTime: string; endTime: string }[]
) {
  const slots: { startTime: string; endTime: string; order: number }[] = [];
  let cursor = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  let order = 0;

  while (cursor + slotDurationMin <= end) {
    const slotStart = cursor;
    const slotEnd = cursor + slotDurationMin;

    const overlapsBreak = breaks.some(
      (b) =>
        slotStart < timeToMinutes(b.endTime) && timeToMinutes(b.startTime) < slotEnd
    );

    if (!overlapsBreak) {
      slots.push({
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        order: order++,
      });
    }
    cursor += slotDurationMin;
  }
  return slots;
}

/**
 * Remplace intégralement la configuration (jours, créneaux, pauses) de
 * l'établissement. Les créneaux sont recalculés automatiquement à partir des
 * horaires de la journée et des pauses déclarées.
 */
schoolConfigRouter.put("/", async (req, res, next) => {
  try {
    const data = updateSchoolSchema.parse(req.body);

    let school = await prisma.schoolConfig.findFirst();
    if (!school) {
      school = await prisma.schoolConfig.create({ data: { name: data.name } });
    }

    await prisma.schoolConfig.update({
      where: { id: school.id },
      data: {
        name: data.name,
        maxSessionsPerDay: data.maxSessionsPerDay,
        freeHalfDays: data.freeHalfDays,
      },
    });

    // On repart d'une base propre pour les jours/créneaux/pauses
    await prisma.workDay.deleteMany({ where: { schoolId: school.id } });

    for (const wd of data.workDays) {
      const slots = buildSlots(wd.startTime, wd.endTime, wd.slotDurationMin, wd.breaks);
      await prisma.workDay.create({
        data: {
          schoolId: school.id,
          dayOfWeek: wd.dayOfWeek,
          startTime: wd.startTime,
          endTime: wd.endTime,
          slots: { create: slots },
          breaks: { create: wd.breaks },
        },
      });
    }

    const updated = await prisma.schoolConfig.findUnique({
      where: { id: school.id },
      include: { workDays: { include: { slots: true, breaks: true }, orderBy: { dayOfWeek: "asc" } } },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
