// Types partagés côté backend, notamment pour le moteur de génération.

export interface SlotRef {
  id: string;
  dayOfWeek: number;
  order: number;
  startTime: string;
  endTime: string;
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  isAvailable: boolean;
}

export interface SchedulableUnit {
  /** identifiant unique de l'unité à placer, ex: "classId::subjectId::teacherId::n" */
  key: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
}

export interface PlacedSession {
  classId: string;
  teacherId: string;
  subjectId: string;
  timeSlotId: string;
  dayOfWeek: number;
  order: number;
}

export interface GenerationResult {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  score: number;
  placed: PlacedSession[];
  unresolved: SchedulableUnit[];
}

export interface RestDay {
  dayOfWeek: number;
  period: "full" | "morning" | "afternoon";
}

/** Heure de bascule matin/après-midi utilisée pour interpréter les repos "demi-journée". */
export const AFTERNOON_THRESHOLD = "13:00";

