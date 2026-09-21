export interface Break {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

export interface TimeSlotDto {
  id: string;
  startTime: string;
  endTime: string;
  order: number;
}

export interface WorkDayDto {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slots: TimeSlotDto[];
  breaks: Break[];
}

export interface SchoolConfigDto {
  id: string;
  name: string;
  maxSessionsPerDay: number;
  maxSubjectHoursPerDay: number;
  freeHalfDays: { dayOfWeek: number; period: "morning" | "afternoon" }[];
  workDays: WorkDayDto[];
}

export interface RestDayDto {
  dayOfWeek: number;
  period: "full" | "morning" | "afternoon";
}

export interface SubjectDto {
  id: string;
  name: string;
  colorHex: string;
}

export interface SubjectRequirementDto {
  id: string;
  subjectId: string;
  subject: SubjectDto;
  weeklyHours: number;
}

export interface LevelDto {
  id: string;
  name: string;
  classes: ClassDto[];
  subjects: SubjectRequirementDto[];
  restDays: RestDayDto[];
}

export interface ClassDto {
  id: string;
  name: string;
  levelId: string;
  level?: LevelDto;
  studentCount?: number;
  teacherAssignments?: { teacher: TeacherDto }[];
}

export interface AvailabilityDto {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface TeacherDto {
  id: string;
  fullName: string;
  subjectId: string;
  subject: SubjectDto;
  weeklyHours: number;
  availabilities: AvailabilityDto[];
  assignments: { class: ClassDto }[];
}

export interface GenerationResponse {
  runId: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  score: number;
  placedCount: number;
  unresolved: { classe: string; matiere: string; professeur: string }[];
  missingAssignments: string[];
}

export interface TimetableSessionDto {
  dayOfWeek: number;
  order: number;
  startTime: string;
  endTime: string;
  subjectId?: string;
  subjectName?: string;
  subjectColor?: string;
  teacherName?: string;
  className?: string;
}

export interface DashboardStats {
  teacherCount: number;
  classCount: number;
  totalWeeklyHours: number;
  bySubject: { name: string; hours: number }[];
  byLevel: { name: string; hours: number }[];
  lastRun: {
    id: string;
    status: string;
    score: number;
    unresolvedCount: number;
    createdAt: string;
  } | null;
}

export const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
