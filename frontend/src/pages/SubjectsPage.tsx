import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, Button, Input, Select, EmptyState } from "../components/ui";
import { api } from "../api/client";
import { LevelDto, SubjectDto } from "../types";

const PALETTE = ["#1E2A44", "#7A4B8A", "#2F855A", "#2B6CB0", "#C0392B", "#C08A2E", "#0F766E", "#9D174D"];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [levels, setLevels] = useState<LevelDto[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [hoursForm, setHoursForm] = useState<Record<string, string>>({}); // key: levelId::subjectId
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [s, l] = await Promise.all([
      api.get<SubjectDto[]>("/subjects"),
      api.get<LevelDto[]>("/classes/levels"),
    ]);
    setSubjects(s.data);
    setLevels(l.data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addSubject() {
    if (!newSubjectName.trim()) return;
    const color = PALETTE[subjects.length % PALETTE.length];
    await api.post("/subjects", { name: newSubjectName.trim(), colorHex: color });
    setNewSubjectName("");
    refresh();
  }

  async function removeSubject(id: string) {
    if (!confirm("Supprimer cette matière et ses volumes horaires associés ?")) return;
    await api.delete(`/subjects/${id}`);
    refresh();
  }

  async function saveHours(levelId: string, subjectId: string) {
    const key = `${levelId}::${subjectId}`;
    const hours = Number(hoursForm[key]);
    if (!hours || hours <= 0) return;
    await api.post("/subjects/requirements", { levelId, subjectId, weeklyHours: hours });
    refresh();
  }

  if (loading) return <Layout title="Matières">Chargement…</Layout>;

  return (
    <Layout
      title="Étape 3 · Matières & volumes horaires"
      description="Créez vos matières, puis indiquez le nombre d'heures hebdomadaires de chaque matière pour chaque niveau."
    >
      <div className="space-y-6 max-w-5xl">
        <Card title="Matières de l'établissement">
          <div className="flex gap-3 mb-4">
            <Input
              placeholder="Ex : Mathématiques"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSubject()}
            />
            <Button onClick={addSubject}>Ajouter</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white"
                style={{ backgroundColor: s.colorHex }}
              >
                {s.name}
                <button onClick={() => removeSubject(s.id)} className="hover:text-white/70">
                  ×
                </button>
              </span>
            ))}
          </div>
        </Card>

        {levels.length === 0 ? (
          <EmptyState
            title="Aucun niveau disponible"
            description="Créez d'abord vos niveaux à l'étape 2 avant de définir les volumes horaires."
          />
        ) : (
          levels.map((level) => (
            <Card key={level.id} title={`Volumes horaires — ${level.name}`}>
              {subjects.length === 0 ? (
                <p className="text-sm text-ink-400">Ajoutez d'abord des matières ci-dessus.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink-400 border-b border-line">
                      <th className="py-2">Matière</th>
                      <th className="py-2 w-40">Heures / semaine</th>
                      <th className="py-2 w-32"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject) => {
                      const existing = level.subjects.find((r) => r.subjectId === subject.id);
                      const key = `${level.id}::${subject.id}`;
                      return (
                        <tr key={subject.id} className="border-b border-line last:border-0">
                          <td className="py-2">{subject.name}</td>
                          <td className="py-2">
                            <Input
                              type="number"
                              min={0}
                              max={40}
                              placeholder={existing ? String(existing.weeklyHours) : "0"}
                              value={hoursForm[key] ?? ""}
                              onChange={(e) =>
                                setHoursForm((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                            />
                          </td>
                          <td className="py-2">
                            <Button variant="secondary" onClick={() => saveHours(level.id, subject.id)}>
                              Enregistrer
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
}
