import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, Button, Input, Select, EmptyState } from "../components/ui";
import { api } from "../api/client";
import { AvailabilityDto, ClassDto, SubjectDto, TeacherDto, DAY_NAMES } from "../types";

const emptyForm = {
  fullName: "",
  subjectId: "",
  weeklyHours: 0,
  classIds: [] as string[],
  availabilities: [] as AvailabilityDto[],
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    const [t, s, c] = await Promise.all([
      api.get<TeacherDto[]>("/teachers"),
      api.get<SubjectDto[]>("/subjects"),
      api.get<ClassDto[]>("/classes"),
    ]);
    setTeachers(t.data);
    setSubjects(s.data);
    setClasses(c.data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function toggleClass(id: string) {
    setForm((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(id)
        ? prev.classIds.filter((c) => c !== id)
        : [...prev.classIds, id],
    }));
  }

  function addAvailability() {
    setForm((prev) => ({
      ...prev,
      availabilities: [
        ...prev.availabilities,
        { dayOfWeek: 0, startTime: "08:00", endTime: "17:00", isAvailable: true },
      ],
    }));
  }

  function updateAvailability(index: number, patch: Partial<AvailabilityDto>) {
    setForm((prev) => ({
      ...prev,
      availabilities: prev.availabilities.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  }

  function removeAvailability(index: number) {
    setForm((prev) => ({ ...prev, availabilities: prev.availabilities.filter((_, i) => i !== index) }));
  }

  function startEdit(t: TeacherDto) {
    setEditingId(t.id);
    setForm({
      fullName: t.fullName,
      subjectId: t.subjectId,
      weeklyHours: t.weeklyHours,
      classIds: t.assignments.map((a) => a.class.id),
      availabilities: t.availabilities.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        isAvailable: a.isAvailable,
      })),
    });
    setShowForm(true);
  }

  function openNewForm() {
    if (showForm && !editingId) {
      setShowForm(false);
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function submit() {
    if (!form.fullName.trim() || !form.subjectId) return;
    if (editingId) {
      await api.put(`/teachers/${editingId}`, form);
    } else {
      await api.post("/teachers", form);
    }
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    refresh();
  }

  async function removeTeacher(id: string) {
    if (!confirm("Supprimer ce professeur ?")) return;
    await api.delete(`/teachers/${id}`);
    refresh();
  }

  if (loading) return <Layout title="Professeurs">Chargement…</Layout>;

  return (
    <Layout
      title="Étape 4 · Professeurs"
      description="Renseignez chaque professeur : matière enseignée, classes attribuées, disponibilités et volume horaire."
      actions={<Button onClick={openNewForm}>{showForm && !editingId ? "Fermer" : "+ Nouveau professeur"}</Button>}
    >
      <div className="space-y-6 max-w-5xl">
        {showForm && (
          <Card title={editingId ? `Modifier — ${form.fullName || "professeur"}` : "Nouveau professeur"}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Nom complet</label>
                  <Input
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    placeholder="Ex : Ahmed Benali"
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Matière</label>
                  <Select
                    value={form.subjectId}
                    onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
                  >
                    <option value="">Sélectionner…</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Heures / semaine souhaitées</label>
                  <Input
                    type="number"
                    min={0}
                    value={form.weeklyHours}
                    onChange={(e) => setForm((p) => ({ ...p, weeklyHours: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-ink-400 mb-2 block">Classes enseignées</label>
                <div className="flex flex-wrap gap-2">
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleClass(c.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border ${
                        form.classIds.includes(c.id)
                          ? "bg-ink text-white border-ink"
                          : "border-line text-ink-600 hover:border-ink-200"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-ink-400">Disponibilités / indisponibilités</label>
                  <button onClick={addAvailability} className="text-xs text-gold-600 hover:underline">
                    + Ajouter une plage
                  </button>
                </div>
                <p className="text-xs text-ink-400 mb-2">
                  Aucune plage = professeur considéré disponible sur tous les créneaux de l'établissement.
                </p>
                <div className="space-y-2">
                  {form.availabilities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Select
                        value={a.dayOfWeek}
                        onChange={(e) => updateAvailability(i, { dayOfWeek: Number(e.target.value) })}
                        className="w-36"
                      >
                        {DAY_NAMES.slice(0, 6).map((name, d) => (
                          <option key={d} value={d}>
                            {name}
                          </option>
                        ))}
                      </Select>
                      <Input
                        type="time"
                        value={a.startTime}
                        onChange={(e) => updateAvailability(i, { startTime: e.target.value })}
                        className="w-28"
                      />
                      <span className="text-ink-400">à</span>
                      <Input
                        type="time"
                        value={a.endTime}
                        onChange={(e) => updateAvailability(i, { endTime: e.target.value })}
                        className="w-28"
                      />
                      <Select
                        value={a.isAvailable ? "1" : "0"}
                        onChange={(e) => updateAvailability(i, { isAvailable: e.target.value === "1" })}
                        className="w-40"
                      >
                        <option value="1">Disponible</option>
                        <option value="0">Indisponible</option>
                      </Select>
                      <button onClick={() => removeAvailability(i)} className="text-red-500 text-xs hover:underline">
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                {editingId && (
                  <Button variant="secondary" onClick={cancelForm}>
                    Annuler
                  </Button>
                )}
                <Button onClick={submit}>
                  {editingId ? "Enregistrer les modifications" : "Enregistrer le professeur"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {teachers.length === 0 ? (
          <EmptyState title="Aucun professeur" description="Ajoutez votre premier professeur avec le bouton ci-dessus." />
        ) : (
          <Card title={`Professeurs (${teachers.length})`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-400 border-b border-line">
                  <th className="py-2">Nom</th>
                  <th className="py-2">Matière</th>
                  <th className="py-2">Classes</th>
                  <th className="py-2">Heures / sem.</th>
                  <th className="py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0">
                    <td className="py-2 font-medium text-ink">{t.fullName}</td>
                    <td className="py-2">{t.subject.name}</td>
                    <td className="py-2 text-ink-400">
                      {t.assignments.map((a) => a.class.name).join(", ") || "—"}
                    </td>
                    <td className="py-2">{t.weeklyHours}h</td>
                    <td className="py-2">
                      <div className="flex items-center gap-3">
                        <button onClick={() => startEdit(t)} className="text-gold-600 text-xs hover:underline">
                          Modifier
                        </button>
                        <button onClick={() => removeTeacher(t.id)} className="text-red-500 text-xs hover:underline">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </Layout>
  );
}
