import "dotenv/config";
import express from "express";
import cors from "cors";

import { schoolConfigRouter } from "./routes/schoolConfig.routes";
import { classesRouter } from "./routes/classes.routes";
import { subjectsRouter } from "./routes/subjects.routes";
import { teachersRouter } from "./routes/teachers.routes";
import { timetableRouter } from "./routes/timetable.routes";
import { exportRouter } from "./routes/export.routes";
import { dashboardRouter } from "./routes/dashboard.routes";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "*" }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/school", schoolConfigRouter);
app.use("/api/classes", classesRouter);
app.use("/api/subjects", subjectsRouter);
app.use("/api/teachers", teachersRouter);
app.use("/api/timetable", timetableRouter);
app.use("/api/export", exportRouter);
app.use("/api/dashboard", dashboardRouter);

// Gestionnaire d'erreurs global : renvoie un message clair au lieu d'un 500 opaque
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(400).json({ error: err.message || "Une erreur est survenue." });
  }
);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`✅ API disponible sur http://localhost:${PORT}`);
});
