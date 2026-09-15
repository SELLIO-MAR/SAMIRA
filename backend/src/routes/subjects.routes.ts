import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const subjectsRouter = Router();

subjectsRouter.get("/", async (_req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: "asc" } });
    res.json(subjects);
  } catch (err) {
    next(err);
  }
});

const subjectSchema = z.object({
  name: z.string().min(1),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#1E2A44"),
});

subjectsRouter.post("/", async (req, res, next) => {
  try {
    const data = subjectSchema.parse(req.body);
    const created = await prisma.subject.create({ data });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

subjectsRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- Volumes horaires par niveau (SubjectRequirement) ---------------------

const requirementSchema = z.object({
  levelId: z.string(),
  subjectId: z.string(),
  weeklyHours: z.number().int().min(1).max(40),
});

subjectsRouter.post("/requirements", async (req, res, next) => {
  try {
    const data = requirementSchema.parse(req.body);
    const upserted = await prisma.subjectRequirement.upsert({
      where: { levelId_subjectId: { levelId: data.levelId, subjectId: data.subjectId } },
      update: { weeklyHours: data.weeklyHours },
      create: data,
    });
    res.status(201).json(upserted);
  } catch (err) {
    next(err);
  }
});

subjectsRouter.delete("/requirements/:id", async (req, res, next) => {
  try {
    await prisma.subjectRequirement.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
