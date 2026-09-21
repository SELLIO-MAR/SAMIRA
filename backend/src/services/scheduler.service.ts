import {
  SlotRef,
  AvailabilityWindow,
  SchedulableUnit,
  PlacedSession,
  GenerationResult,
} from "../types";

/**
 * Moteur de génération automatique des emplois du temps.
 *
 * Stratégie : résolution de type CSP (Constraint Satisfaction Problem)
 *  - Variables   : les "unités" à placer (une unité = une séance d'1h de
 *                  matière X pour la classe Y avec le professeur Z).
 *  - Domaines    : les créneaux compatibles avec la disponibilité du prof.
 *  - Contraintes dures (jamais violées) :
 *      1. Un professeur ne peut pas être sur deux créneaux identiques.
 *      2. Une classe ne peut pas avoir deux matières sur le même créneau.
 *      3. Le nombre de séances/jour d'une classe ne dépasse pas le maximum.
 *      4. Le créneau doit être dans la fenêtre de disponibilité du prof.
 *  - Contraintes souples (optimisées, pas obligatoires) :
 *      a. Éviter de répéter la même matière plusieurs fois le même jour.
 *      b. Éviter les heures "creuses" (trous) dans la journée d'une classe.
 *      c. Répartir les séances sur l'ensemble de la semaine.
 *
 * L'algorithme combine :
 *  - un tri "MRV" (Minimum Remaining Values) : on place en priorité les
 *    unités qui ont le moins d'options, car ce sont elles qui risquent le
 *    plus de bloquer la résolution si on les traite en dernier ;
 *  - du backtracking avec forward-checking (retour arrière) ;
 *  - plusieurs tentatives ("restarts") avec un ordre aléatoire différent,
 *    en conservant la meilleure solution trouvée (le plus de séances
 *    placées, puis le meilleur score de qualité).
 */

const MAX_RESTARTS = 12;
const MAX_BACKTRACK_STEPS = 60_000; // garde-fou pour éviter un temps infini
const TIME_BUDGET_MS = 8_000;

interface InternalUnit extends SchedulableUnit {
  domain: SlotRef[]; // recalculé à chaque tentative
}

function slotKey(entityId: string, dayOfWeek: number, order: number) {
  return `${entityId}::${dayOfWeek}::${order}`;
}

function isSlotWithinAvailability(
  slot: SlotRef,
  windows: AvailabilityWindow[]
): boolean {
  // Aucune règle déclarée => on considère l'enseignant disponible partout.
  const relevant = windows.filter((w) => w.dayOfWeek === slot.dayOfWeek);
  if (relevant.length === 0) return true;

  // S'il existe une indisponibilité explicite qui couvre ce créneau -> refusé.
  const blocked = relevant.some(
    (w) =>
      !w.isAvailable &&
      timeOverlaps(slot.startTime, slot.endTime, w.startTime, w.endTime)
  );
  if (blocked) return false;

  // S'il existe au moins une disponibilité positive déclarée ce jour-là,
  // le créneau doit être couvert par une de ces fenêtres.
  const positiveWindows = relevant.filter((w) => w.isAvailable);
  if (positiveWindows.length === 0) return true; // que des indispos ponctuelles
  return positiveWindows.some((w) =>
    timeWithin(slot.startTime, slot.endTime, w.startTime, w.endTime)
  );
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function timeOverlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

function timeWithin(
  innerStart: string,
  innerEnd: string,
  outerStart: string,
  outerEnd: string
): boolean {
  return (
    toMinutes(innerStart) >= toMinutes(outerStart) &&
    toMinutes(innerEnd) <= toMinutes(outerEnd)
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Calcule un score de qualité pour une solution complète (plus haut = meilleur).
 * Pénalise les heures creuses et les répétitions de matière le même jour.
 */
function countGaps(usedOrders: number[]): number {
  if (usedOrders.length <= 1) return 0;
  const sorted = [...usedOrders].sort((a, b) => a - b);
  const span = sorted[sorted.length - 1] - sorted[0] + 1;
  return span - sorted.length;
}

/**
 * Score de qualité d'une solution complète (plus haut = meilleur / 0 = parfait).
 *
 * Deux sources de pénalité :
 *  - Heures creuses côté PROFESSEUR (priorité la plus haute) : un prof doit
 *    arriver, enchaîner toutes ses séances de la journée, puis repartir —
 *    pas rester à attendre entre deux séances séparées par un trou.
 *  - Heures creuses côté CLASSE, et répétition d'une même matière le même jour.
 */
function scoreSolution(
  placed: PlacedSession[],
  slotsByDay: Map<number, SlotRef[]>
): number {
  let penalty = 0;

  // --- Heures creuses côté professeur (poids le plus fort) ---------------
  const byTeacherDay = new Map<string, PlacedSession[]>();
  for (const s of placed) {
    const key = `${s.teacherId}::${s.dayOfWeek}`;
    if (!byTeacherDay.has(key)) byTeacherDay.set(key, []);
    byTeacherDay.get(key)!.push(s);
  }
  for (const sessions of byTeacherDay.values()) {
    const gaps = countGaps(sessions.map((s) => s.order));
    penalty += gaps * 6; // un trou dans la journée d'un prof coûte cher
  }

  // --- Heures creuses côté classe + répétition de matière -----------------
  const byClassDay = new Map<string, PlacedSession[]>();
  for (const s of placed) {
    const key = `${s.classId}::${s.dayOfWeek}`;
    if (!byClassDay.has(key)) byClassDay.set(key, []);
    byClassDay.get(key)!.push(s);
  }

  for (const sessions of byClassDay.values()) {
    penalty += countGaps(sessions.map((s) => s.order)) * 3;

    // Répétition de la même matière le même jour
    const subjectCounts = new Map<string, number>();
    for (const s of sessions) {
      subjectCounts.set(s.subjectId, (subjectCounts.get(s.subjectId) ?? 0) + 1);
    }
    for (const count of subjectCounts.values()) {
      if (count > 1) penalty += (count - 1) * 2;
    }
  }

  return -penalty;
}

export function generateTimetable(params: {
  slots: SlotRef[]; // tous les créneaux occupables de la semaine
  units: SchedulableUnit[]; // toutes les séances à placer
  teacherAvailability: Map<string, AvailabilityWindow[]>;
  maxSessionsPerDayPerClass: number;
  /** Nombre maximum de séances de LA MÊME matière, pour UNE MÊME classe, le même jour (contrainte dure). */
  maxSubjectHoursPerDayPerClass: number;
  /** Créneaux interdits pour une classe donnée (jours/demi-journées de repos de son niveau). */
  classBlockedSlots: Map<string, Set<string>>;
}): GenerationResult {
  const {
    slots,
    units,
    teacherAvailability,
    maxSessionsPerDayPerClass,
    maxSubjectHoursPerDayPerClass,
    classBlockedSlots,
  } = params;

  const slotsByDay = new Map<number, SlotRef[]>();
  for (const s of slots) {
    if (!slotsByDay.has(s.dayOfWeek)) slotsByDay.set(s.dayOfWeek, []);
    slotsByDay.get(s.dayOfWeek)!.push(s);
  }

  let bestResult: GenerationResult | null = null;
  const deadline = Date.now() + TIME_BUDGET_MS;

  for (let attempt = 0; attempt < MAX_RESTARTS; attempt++) {
    if (Date.now() > deadline) break;

    const result = attemptOnce(
      slots,
      units,
      teacherAvailability,
      maxSessionsPerDayPerClass,
      maxSubjectHoursPerDayPerClass,
      classBlockedSlots,
      slotsByDay,
      deadline
    );

    if (!bestResult) {
      bestResult = result;
    } else {
      const better =
        result.unresolved.length < bestResult.unresolved.length ||
        (result.unresolved.length === bestResult.unresolved.length &&
          result.score > bestResult.score);
      if (better) bestResult = result;
    }

    if (bestResult.unresolved.length === 0) break; // solution complète trouvée
  }

  return bestResult!;
}

function attemptOnce(
  slots: SlotRef[],
  unitsInput: SchedulableUnit[],
  teacherAvailability: Map<string, AvailabilityWindow[]>,
  maxSessionsPerDayPerClass: number,
  maxSubjectHoursPerDayPerClass: number,
  classBlockedSlots: Map<string, Set<string>>,
  slotsByDay: Map<number, SlotRef[]>,
  deadline: number
): GenerationResult {
  // 1) Construire le domaine (créneaux compatibles) de chaque unité : le prof
  // doit être disponible ET le créneau ne doit pas tomber sur un jour/demi-
  // journée de repos du niveau de la classe.
  const units: InternalUnit[] = shuffle(unitsInput).map((u) => {
    const windows = teacherAvailability.get(u.teacherId) ?? [];
    const blocked = classBlockedSlots.get(u.classId);
    const domain = slots.filter(
      (slot) => isSlotWithinAvailability(slot, windows) && !blocked?.has(slot.id)
    );
    return { ...u, domain: shuffle(domain) };
  });

  // 2) Tri MRV : les unités les plus contraintes (petit domaine) en premier
  units.sort((a, b) => a.domain.length - b.domain.length);

  const teacherBusy = new Set<string>(); // teacherId::day::order
  const classBusy = new Set<string>(); // classId::day::order
  const classDayCount = new Map<string, number>(); // classId::day -> count
  const classDaySubjectCount = new Map<string, number>(); // classId::day::subjectId -> count

  const placed: PlacedSession[] = [];
  const unresolved: SchedulableUnit[] = [];

  let steps = 0;

  function tryPlace(index: number): boolean {
    if (index >= units.length) return true;
    if (++steps > MAX_BACKTRACK_STEPS || Date.now() > deadline) return false;

    const unit = units[index];
    for (const slot of unit.domain) {
      const tKey = slotKey(unit.teacherId, slot.dayOfWeek, slot.order);
      const cKey = slotKey(unit.classId, slot.dayOfWeek, slot.order);
      const dayCountKey = `${unit.classId}::${slot.dayOfWeek}`;
      const subjectDayKey = `${unit.classId}::${slot.dayOfWeek}::${unit.subjectId}`;

      if (teacherBusy.has(tKey)) continue;
      if (classBusy.has(cKey)) continue;
      const currentCount = classDayCount.get(dayCountKey) ?? 0;
      if (currentCount >= maxSessionsPerDayPerClass) continue;
      const currentSubjectCount = classDaySubjectCount.get(subjectDayKey) ?? 0;
      // Contrainte dure : une matière ne peut pas dépasser N heures pour une
      // même classe le même jour (ex: pas plus de 2h de Maths le lundi).
      if (currentSubjectCount >= maxSubjectHoursPerDayPerClass) continue;

      // Placer provisoirement
      teacherBusy.add(tKey);
      classBusy.add(cKey);
      classDayCount.set(dayCountKey, currentCount + 1);
      classDaySubjectCount.set(subjectDayKey, currentSubjectCount + 1);
      placed.push({
        classId: unit.classId,
        teacherId: unit.teacherId,
        subjectId: unit.subjectId,
        timeSlotId: slot.id,
        dayOfWeek: slot.dayOfWeek,
        order: slot.order,
      });

      if (tryPlace(index + 1)) return true;

      // Retour arrière
      placed.pop();
      teacherBusy.delete(tKey);
      classBusy.delete(cKey);
      classDayCount.set(dayCountKey, currentCount);
      classDaySubjectCount.set(subjectDayKey, currentSubjectCount);
    }
    return false;
  }

  const fullyPlaced = tryPlace(0);

  if (!fullyPlaced) {
    // Le backtracking complet n'a pas abouti dans le budget imparti : on
    // repart d'un état propre et on place gloutonnement tout ce qui peut
    // encore l'être, en rapportant clairement les séances impossibles à caser.
    return greedyFallback(units, maxSessionsPerDayPerClass, maxSubjectHoursPerDayPerClass, slotsByDay);
  }

  const score = scoreSolution(placed, slotsByDay);
  return { status: "SUCCESS", score, placed, unresolved };
}

/**
 * Repli glouton : utilisé quand le backtracking complet n'aboutit pas dans le
 * budget imparti. Place unité par unité dans le premier créneau libre
 * compatible, et rapporte clairement les séances qui n'ont pas pu être casées
 * pour que l'administrateur puisse ajuster manuellement (ex: alléger la
 * charge d'un professeur ou revoir ses disponibilités).
 */
function greedyFallback(
  units: InternalUnit[],
  maxSessionsPerDayPerClass: number,
  maxSubjectHoursPerDayPerClass: number,
  slotsByDay: Map<number, SlotRef[]>
): GenerationResult {
  const teacherBusy = new Set<string>();
  const classBusy = new Set<string>();
  const classDayCount = new Map<string, number>();
  const classDaySubjectCount = new Map<string, number>();
  const placed: PlacedSession[] = [];
  const unresolved: SchedulableUnit[] = [];

  for (const unit of units) {
    let ok = false;
    for (const slot of unit.domain) {
      const tKey = slotKey(unit.teacherId, slot.dayOfWeek, slot.order);
      const cKey = slotKey(unit.classId, slot.dayOfWeek, slot.order);
      const dayCountKey = `${unit.classId}::${slot.dayOfWeek}`;
      const subjectDayKey = `${unit.classId}::${slot.dayOfWeek}::${unit.subjectId}`;
      const currentCount = classDayCount.get(dayCountKey) ?? 0;
      const currentSubjectCount = classDaySubjectCount.get(subjectDayKey) ?? 0;

      if (teacherBusy.has(tKey)) continue;
      if (classBusy.has(cKey)) continue;
      if (currentCount >= maxSessionsPerDayPerClass) continue;
      if (currentSubjectCount >= maxSubjectHoursPerDayPerClass) continue;

      teacherBusy.add(tKey);
      classBusy.add(cKey);
      classDayCount.set(dayCountKey, currentCount + 1);
      classDaySubjectCount.set(subjectDayKey, currentSubjectCount + 1);
      placed.push({
        classId: unit.classId,
        teacherId: unit.teacherId,
        subjectId: unit.subjectId,
        timeSlotId: slot.id,
        dayOfWeek: slot.dayOfWeek,
        order: slot.order,
      });
      ok = true;
      break;
    }
    if (!ok) unresolved.push(unit);
  }

  const score = scoreSolution(placed, slotsByDay);
  return {
    status: unresolved.length === 0 ? "SUCCESS" : "PARTIAL",
    score,
    placed,
    unresolved,
  };
}
