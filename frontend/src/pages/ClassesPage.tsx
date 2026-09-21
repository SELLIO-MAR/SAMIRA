import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, Button, Input, Select, EmptyState } from "../components/ui";
import { api } from "../api/client";
import { LevelDto, RestDayDto, SchoolConfigDto, DAY_NAMES } from "../types";

export default function ClassesPage() {
  const [levels, setLevels] = useState<LevelDto[]>([]);
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [newLevelName, setNewLevelName] = useState("");
  const [newClassNames, setNewClassNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [levelsRes, schoolRes] = await Promise.all([
      api.get<LevelDto[]>("/classes/levels"),
      api.get<SchoolConfigDto>("/school"),
    ]);

    setLevels(
      levelsRes.data.map((level) => ({
        ...level,
        restDays: level.restDays ?? [],
      }))
    );

    setWorkDays(
      schoolRes.data.workDays.map((w) => w.dayOfWeek).sort((a, b) => a - b)
    );

    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleRestDay(
    level: LevelDto,
    dayOfWeek: number,
    period: RestDayDto["period"] | "none"
  ) {
    let restDays = (level.restDays ?? []).filter(
      (r) => r.dayOfWeek !== dayOfWeek
    );

    if (period !== "none") {
      restDays = [...restDays, { dayOfWeek, period }];
    }

    await api.put(`/classes/levels/${level.id}/rest-days`, { restDays });
    refresh();
  }

  async function addLevel() {
    if (!newLevelName.trim()) return;

    await api.post("/classes/levels", {
      name: newLevelName.trim(),
    });

    setNewLevelName("");
    refresh();
  }

  async function removeLevel(id: string) {
    if (!confirm("Supprimer ce niveau et toutes ses classes ?")) return;

    await api.delete(`/classes/levels/${id}`);
    refresh();
  }

  async function addClass(levelId: string) {
    const name = newClassNames[levelId]?.trim();

    if (!name) return;

    await api.post("/classes", { name, levelId });

    setNewClassNames((prev) => ({
      ...prev,
      [levelId]: "",
    }));

    refresh();
  }

  async function removeClass(id: string) {
    if (!confirm("Supprimer cette classe ?")) return;

    await api.delete(`/classes/${id}`);
    refresh();
  }

  if (loading) {
    return (
      <Layout title="Niveaux & classes">
        Chargement...
      </Layout>
    );
  }

  return (
    <Layout
      title="Étape 2 · Niveaux & classes"
      description="Créez vos niveaux puis les classes qui leur appartiennent."
    >
      <div className="space-y-6 max-w-4xl">
        <Card title="Ajouter un niveau">
          <div className="flex gap-3">
            <Input
              placeholder="Ex : 1AC, TC, 1BAC SM"
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLevel()}
            />
            <Button onClick={addLevel}>Ajouter</Button>
          </div>
        </Card>

        {levels.length === 0 ? (
          <EmptyState
            title="Aucun niveau créé"
            description="Commencez par ajouter un niveau ci-dessus."
          />
        ) : (
          levels.map((level) => (
            <Card
              key={level.id}
              title={level.name}
              actions={
                <button
                  onClick={() => removeLevel(level.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Supprimer le niveau
                </button>
              }
            >
              <div className="space-y-4">
                {workDays.length > 0 && (
                  <div className="pb-3 border-b border-line">
                    <p className="text-xs text-ink-400 mb-2">
                      Jours de repos de ce niveau :
                    </p>

                    <div className="flex flex-wrap gap-3">
                      {workDays.map((d) => {
                        const current = (level.restDays ?? []).find(
                          (r) => r.dayOfWeek === d
                        );

                        return (
                          <div
                            key={d}
                            className="flex items-center gap-1.5"
                          >
                            <span className="text-xs text-ink-600 w-16">
                              {DAY_NAMES[d]}
                            </span>

                            <Select
                              value={current?.period ?? "none"}
                              onChange={(e) =>
                                toggleRestDay(
                                  level,
                                  d,
                                  e.target.value as
                                    | RestDayDto["period"]
                                    | "none"
                                )
                              }
                              className="w-36 text-xs"
                            >
                              <option value="none">Cours normal</option>
                              <option value="full">
                                Repos — journée entière
                              </option>
                              <option value="morning">
                                Repos — matin
                              </option>
                              <option value="afternoon">
                                Repos — après-midi
                              </option>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {level.classes.length === 0 && (
                    <p className="text-sm text-ink-400">
                      Aucune classe pour ce niveau.
                    </p>
                  )}

                  {level.classes.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-2 bg-ink-50 border border-line rounded-full px-3 py-1 text-sm"
                    >
                      {c.name}

                      <button
                        onClick={() => removeClass(c.id)}
                        className="text-ink-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-line">
                  <Input
                    placeholder={`Ex : ${level.name}-A`}
                    value={newClassNames[level.id] ?? ""}
                    onChange={(e) =>
                      setNewClassNames((prev) => ({
                        ...prev,
                        [level.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && addClass(level.id)
                    }
                  />

                  <Button
                    variant="secondary"
                    onClick={() => addClass(level.id)}
                  >
                    + Classe
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
}