import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import TimetableGrid from "../components/TimetableGrid";
import { Card, Button, Select, EmptyState } from "../components/ui";
import { api, downloadFile } from "../api/client";
import { ClassDto, SchoolConfigDto, TimetableSessionDto } from "../types";

export default function ClassTimetablePage() {
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessions, setSessions] = useState<TimetableSessionDto[]>([]);
  const [school, setSchool] = useState<SchoolConfigDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<ClassDto[]>("/classes"), api.get<SchoolConfigDto>("/school")]).then(
      ([c, s]) => {
        setClasses(c.data);
        setSchool(s.data);
        if (c.data.length > 0) setSelectedClassId(c.data[0].id);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    api.get(`/timetable/class/${selectedClassId}`).then(({ data }) => setSessions(data.sessions));
  }, [selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const workDays = school?.workDays.map((w) => w.dayOfWeek).sort((a, b) => a - b) ?? [];
  const slotRows = buildUnionSlotRows(school);

  if (loading) return <Layout title="Emplois du temps — Classes">Chargement…</Layout>;

  return (
    <Layout
      title="Emploi du temps de chaque classe"
      description="Sélectionnez une classe pour consulter et exporter son emploi du temps."
      actions={
        selectedClassId && sessions.length > 0 ? (
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(`/export/class/${selectedClassId}/pdf`, `emploi_du_temps_${selectedClass?.name}.pdf`)
              }
            >
              Télécharger PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  `/export/class/${selectedClassId}/excel`,
                  `emploi_du_temps_${selectedClass?.name}.xlsx`
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
      {classes.length === 0 ? (
        <EmptyState title="Aucune classe" description="Créez vos classes à l'étape 2." />
      ) : (
        <div className="space-y-5 max-w-5xl">
          <Card>
            <label className="text-xs text-ink-400 mb-1 block">Classe</label>
            <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="max-w-xs">
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Card>

          {sessions.length === 0 ? (
            <EmptyState
              title="Aucun emploi du temps généré pour cette classe"
              description="Lancez une génération depuis l'étape 5, ou vérifiez les affectations de professeurs."
            />
          ) : (
            <TimetableGrid
              sessions={sessions}
              workDays={workDays}
              slotRows={slotRows}
              renderLabel={(s) => `${s.subjectName}${s.teacherName ? ` · ${s.teacherName}` : ""}`}
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
