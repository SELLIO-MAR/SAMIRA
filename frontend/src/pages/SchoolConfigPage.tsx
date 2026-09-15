import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Card, Button, Input } from "../components/ui";
import { api } from "../api/client";
import { SchoolConfigDto, DAY_NAMES } from "../types";

interface DayForm {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
  breaks: { label: string; startTime: string; endTime: string }[];
}

const DEFAULT_DAYS: DayForm[] = DAY_NAMES.slice(0, 6).map((_, i) => ({
  dayOfWeek: i,
  enabled: i < 5,
  startTime: "08:00",
  endTime: "17:00",
  slotDurationMin: 60,
  breaks: i < 5 ? [{ label: "Pause déjeuner", startTime: "12:00", endTime: "13:00" }] : [],
}));

export default function SchoolConfigPage() {
  const [name, setName] = useState("Mon établissement");
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState(6);
  const [days, setDays] = useState<DayForm[]>(DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<SchoolConfigDto>("/school").then(({ data }) => {
      setName(data.name);
      setMaxSessionsPerDay(data.maxSessionsPerDay);
      if (data.workDays.length > 0) {
        const byDay = new Map(data.workDays.map((wd) => [wd.dayOfWeek, wd]));
        setDays(
          DEFAULT_DAYS.map((d) => {
            const wd = byDay.get(d.dayOfWeek);
            if (!wd) return { ...d, enabled: false };
            return {
              dayOfWeek: d.dayOfWeek,
              enabled: true,
              startTime: wd.startTime,
              endTime: wd.endTime,
              slotDurationMin: 60,
              breaks: wd.breaks.map((b) => ({ label: b.label, startTime: b.startTime, endTime: b.endTime })),
            };
          })
        );
      }
      setLoading(false);
    });
  }, []);

  function updateDay(index: number, patch: Partial<DayForm>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addBreak(index: number) {
    updateDay(index, {
      breaks: [...days[index].breaks, { label: "Pause", startTime: "10:00", endTime: "10:15" }],
    });
  }

  function updateBreak(dayIndex: number, breakIndex: number, patch: Partial<{ label: string; startTime: string; endTime: string }>) {
    const breaks = [...days[dayIndex].breaks];
    breaks[breakIndex] = { ...breaks[breakIndex], ...patch };
    updateDay(dayIndex, { breaks });
  }

  function removeBreak(dayIndex: number, breakIndex: number) {
    updateDay(dayIndex, { breaks: days[dayIndex].breaks.filter((_, i) => i !== breakIndex) });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await api.put("/school", {
        name,
        maxSessionsPerDay,
        freeHalfDays: [],
        workDays: days
          .filter((d) => d.enabled)
          .map((d) => ({
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            slotDurationMin: d.slotDurationMin,
            breaks: d.breaks,
          })),
      });
      setMessage("Configuration enregistrée.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Layout title="Configuration de l'établissement">Chargement…</Layout>;

  return (
    <Layout
      title="Étape 1 · Configuration de l'établissement"
      description="Définissez les jours travaillés, les horaires de chaque journée, les pauses et le nombre maximum de séances par jour."
      actions={
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl">
        {message && <p className="text-sm text-ink-600">{message}</p>}

        <Card title="Informations générales">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-ink-400 mb-1 block">Nom de l'établissement</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-ink-400 mb-1 block">Nombre maximum de séances / jour</label>
              <Input
                type="number"
                min={1}
                max={15}
                value={maxSessionsPerDay}
                onChange={(e) => setMaxSessionsPerDay(Number(e.target.value))}
              />
            </div>
          </div>
        </Card>

        <Card title="Jours de travail & créneaux horaires">
          <div className="space-y-5">
            {days.map((day, index) => (
              <div key={day.dayOfWeek} className="border border-line rounded-md p-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 w-40 font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={(e) => updateDay(index, { enabled: e.target.checked })}
                    />
                    {DAY_NAMES[day.dayOfWeek]}
                  </label>
                  {day.enabled && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-ink-400">de</span>
                        <Input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => updateDay(index, { startTime: e.target.value })}
                          className="w-32"
                        />
                        <span className="text-ink-400">à</span>
                        <Input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => updateDay(index, { endTime: e.target.value })}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-ink-400">durée séance (min)</span>
                        <Input
                          type="number"
                          min={15}
                          step={5}
                          value={day.slotDurationMin}
                          onChange={(e) => updateDay(index, { slotDurationMin: Number(e.target.value) })}
                          className="w-20"
                        />
                      </div>
                    </>
                  )}
                </div>

                {day.enabled && (
                  <div className="mt-3 pl-[176px] space-y-2">
                    {day.breaks.map((b, bi) => (
                      <div key={bi} className="flex items-center gap-2 text-sm">
                        <Input
                          value={b.label}
                          onChange={(e) => updateBreak(index, bi, { label: e.target.value })}
                          className="w-40"
                        />
                        <Input
                          type="time"
                          value={b.startTime}
                          onChange={(e) => updateBreak(index, bi, { startTime: e.target.value })}
                          className="w-28"
                        />
                        <span className="text-ink-400">à</span>
                        <Input
                          type="time"
                          value={b.endTime}
                          onChange={(e) => updateBreak(index, bi, { endTime: e.target.value })}
                          className="w-28"
                        />
                        <button
                          onClick={() => removeBreak(index, bi)}
                          className="text-red-500 text-xs hover:underline"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addBreak(index)}
                      className="text-xs text-gold-600 hover:underline"
                    >
                      + Ajouter une pause
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
