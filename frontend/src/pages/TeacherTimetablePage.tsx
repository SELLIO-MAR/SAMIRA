import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import TimetableGrid from "../components/TimetableGrid";
import { Card, Button, Select, EmptyState } from "../components/ui";
import { api, downloadFile } from "../api/client";
import { SchoolConfigDto, TeacherDto, TimetableSessionDto } from "../types";

interface ServiceSheet {
  teacher: { id: string; fullName: string; subject: string; weeklyHours: number; classes: string[] };
  totalPlacedHours: number;
}

export default function TeacherTimetablePage() {
  const [teachers, setTeachers] = useState<TeacherDto[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [sessions, setSessions] = useState<TimetableSessionDto[]>([]);
  const [service, setService] = useState<ServiceSheet | null>(null);
  const [school, setSchool] = useState<SchoolConfigDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<TeacherDto[]>("/teachers"), api.get<SchoolConfigDto>("/school")]).then(
      ([t, s]) => {
        setTeachers(t.data);
        setSchool(s.data);
        if (t.data.length > 0) setSelectedTeacherId(t.data[0].id);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!selectedTeacherId) return;
    api.get(`/timetable/teacher/${selectedTeacherId}`).then(({ data }) => setSessions(data.sessions));
    api.get(`/timetable/teacher/${selectedTeacherId}/service`).then(({ data }) => setService(data));
  }, [selectedTeacherId]);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const workDays = school?.workDays.map((w) => w.dayOfWeek).sort((a, b) => a - b) ?? [];
  const slotRows = buildUnionSlotRows(school);

  if (loading) return <Layout title="Emplois du temps — Professeurs">Chargement…</Layout>;

  return (
    <Layout
      title="Emploi du temps & tableau de service — Professeurs"
      description="Sélectionnez un professeur pour consulter sa fiche de service et son emploi du temps individuel."
      actions={
        selectedTeacherId && sessions.length > 0 ? (
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  `/export/teacher/${selectedTeacherId}/pdf`,
                  `emploi_du_temps_${selectedTeacher?.fullName}.pdf`
                )
              }
            >
              Télécharger PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  `/export/teacher/${selectedTeacherId}/excel`,
                  `emploi_du_temps_${selectedTeacher?.fullName}.xlsx`
                )
              }
            >
              Télécharger Excel
            </Button>
            <Button onClick={() => window.print()}>Imprimer</Button>
          </>
        ) : undefined
      }
    >
      {teachers.length === 0 ? (
        <EmptyState title="Aucun professeur" description="Ajoutez des professeurs à l'étape 4." />
      ) : (
        <div className="space-y-5 max-w-5xl">
          <Card>
            <label className="text-xs text-ink-400 mb-1 block">Professeur</label>
            <Select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="max-w-xs"
            >
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </Select>
          </Card>

          {service && (
            <Card title="Fiche de service">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-ink-400 text-xs">Matière</p>
                  <p className="font-medium">{service.teacher.subject}</p>
                </div>
                <div>
                  <p className="text-ink-400 text-xs">Heures contractuelles / sem.</p>
                  <p className="font-medium">{service.teacher.weeklyHours}h</p>
                </div>
                <div>
                  <p className="text-ink-400 text-xs">Heures placées</p>
                  <p className="font-medium">{service.totalPlacedHours}h</p>
                </div>
                <div>
                  <p className="text-ink-400 text-xs">Classes attribuées</p>
                  <p className="font-medium">{service.teacher.classes.join(", ") || "—"}</p>
                </div>
              </div>
            </Card>
          )}

          {sessions.length === 0 ? (
            <EmptyState
              title="Aucun emploi du temps généré pour ce professeur"
              description="Lancez une génération depuis l'étape 5."
            />
          ) : (
            <TimetableGrid
              sessions={sessions}
              workDays={workDays}
              slotRows={slotRows}
              renderLabel={(s) => `${s.subjectName} · ${s.className}`}
            />
          )}
        </div>
      )}
    </Layout>
  );
}

function buildUnionSlotRows(school: SchoolConfigDto | null) {
  if (!school) return [];
  const map = new Map<number, { order: number; startTime: string; endTime: string }>();
  for (const wd of school.workDays) {
    for (const s of wd.slots) {
      if (!map.has(s.order)) map.set(s.order, { order: s.order, startTime: s.startTime, endTime: s.endTime });
    }
  }
  return [...map.values()].sort((a, b) => a.order - b.order);
}
