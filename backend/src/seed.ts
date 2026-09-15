import { prisma } from "./db";

/**
 * Jeu de données d'exemple, repris du cahier des charges, pour démarrer
 * rapidement : niveau 1AC avec ses matières, classes 1AC-A/B/C, et le
 * professeur Ahmed Benali (Mathématiques).
 *
 * Lancer avec : npm run seed
 */
async function main() {
  console.log("🌱 Insertion des données d'exemple...");

  const school = await prisma.schoolConfig.upsert({
    where: { id: "seed-school" },
    update: {},
    create: { id: "seed-school", name: "Collège Al Amal", maxSessionsPerDay: 6 },
  });

  // Jours travaillés + créneaux (1h) + pause
  const days = [
    { dayOfWeek: 0, startTime: "08:00", endTime: "17:00" }, // Lundi
    { dayOfWeek: 1, startTime: "08:00", endTime: "17:00" }, // Mardi
    { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" }, // Mercredi
    { dayOfWeek: 3, startTime: "08:00", endTime: "17:00" }, // Jeudi
    { dayOfWeek: 4, startTime: "08:00", endTime: "17:00" }, // Vendredi
  ];

  await prisma.workDay.deleteMany({ where: { schoolId: school.id } });
  for (const d of days) {
    const slots = [];
    let cursor = timeToMin(d.startTime);
    const end = timeToMin(d.endTime);
    let order = 0;
    while (cursor + 60 <= end) {
      // pause déjeuner 12h-13h ignorée pour les créneaux
      if (!(cursor >= timeToMin("12:00") && cursor < timeToMin("13:00"))) {
        slots.push({
          startTime: minToTime(cursor),
          endTime: minToTime(cursor + 60),
          order: order++,
        });
      }
      cursor += 60;
    }
    await prisma.workDay.create({
      data: {
        schoolId: school.id,
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime,
        slots: { create: slots },
        breaks:
          d.endTime === "17:00"
            ? { create: [{ label: "Pause déjeuner", startTime: "12:00", endTime: "13:00" }] }
            : undefined,
      },
    });
  }

  const level1AC = await prisma.level.upsert({
    where: { schoolId_name: { schoolId: school.id, name: "1AC" } },
    update: {},
    create: { schoolId: school.id, name: "1AC" },
  });

  const subjectDefs = [
    { name: "Mathématiques", colorHex: "#1E2A44", hours: 5 },
    { name: "Français", colorHex: "#7A4B8A", hours: 5 },
    { name: "SVT", colorHex: "#2F855A", hours: 2 },
    { name: "Physique-Chimie", colorHex: "#2B6CB0", hours: 2 },
    { name: "Arabe", colorHex: "#C0392B", hours: 5 },
    { name: "Anglais", colorHex: "#C08A2E", hours: 2 },
  ];

  const subjects: Record<string, string> = {};
  for (const s of subjectDefs) {
    const subject = await prisma.subject.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name, colorHex: s.colorHex },
    });
    subjects[s.name] = subject.id;
    await prisma.subjectRequirement.upsert({
      where: { levelId_subjectId: { levelId: level1AC.id, subjectId: subject.id } },
      update: { weeklyHours: s.hours },
      create: { levelId: level1AC.id, subjectId: subject.id, weeklyHours: s.hours },
    });
  }

  const classNames = ["1AC-A", "1AC-B", "1AC-C"];
  const classIds: Record<string, string> = {};
  for (const name of classNames) {
    const cls = await prisma.class.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: {},
      create: { schoolId: school.id, name, levelId: level1AC.id, studentCount: 32 },
    });
    classIds[name] = cls.id;
  }

  const existingTeacher = await prisma.teacher.findFirst({
    where: { schoolId: school.id, fullName: "Ahmed Benali" },
  });
  if (!existingTeacher) {
    await prisma.teacher.create({
      data: {
        schoolId: school.id,
        fullName: "Ahmed Benali",
        subjectId: subjects["Mathématiques"],
        weeklyHours: 15,
        assignments: {
          create: [
            { classId: classIds["1AC-A"] },
            { classId: classIds["1AC-B"] },
            { classId: classIds["2AC-A"] ?? classIds["1AC-A"] },
          ],
        },
        availabilities: {
          create: [
            { dayOfWeek: 0, startTime: "08:00", endTime: "17:00", isAvailable: true },
            { dayOfWeek: 1, startTime: "10:00", endTime: "17:00", isAvailable: true },
            { dayOfWeek: 2, startTime: "08:00", endTime: "12:00", isAvailable: true },
          ],
        },
      },
    });
  }

  console.log("✅ Données d'exemple créées. Vous pouvez lancer une génération depuis l'interface.");
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
