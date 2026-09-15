import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Layout from "../components/Layout";
import { Card, StatCard } from "../components/ui";
import { api } from "../api/client";
import { DashboardStats } from "../types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>("/dashboard/stats").then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <Layout title="Tableau de bord">Chargement…</Layout>;

  return (
    <Layout
      title="Tableau de bord"
      description="Vue d'ensemble de l'établissement : effectifs, volumes horaires et statut de la dernière génération."
    >
      <div className="space-y-6 max-w-5xl">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Professeurs" value={stats.teacherCount} />
          <StatCard label="Classes" value={stats.classCount} />
          <StatCard label="Heures / semaine (total)" value={stats.totalWeeklyHours} />
          <StatCard
            label="Dernière génération"
            value={stats.lastRun ? statusLabel(stats.lastRun.status) : "Aucune"}
            hint={stats.lastRun ? new Date(stats.lastRun.createdAt).toLocaleString("fr-FR") : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card title="Répartition des heures par matière">
            {stats.bySubject.length === 0 ? (
              <p className="text-sm text-ink-400">Aucune donnée. Configurez les matières (étape 3).</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.bySubject} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E6EC" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#1E2A44" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Répartition des heures par niveau">
            {stats.byLevel.length === 0 ? (
              <p className="text-sm text-ink-400">Aucune donnée. Configurez les niveaux (étape 2).</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.byLevel} margin={{ top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E6EC" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#C08A2E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {stats.lastRun && stats.lastRun.unresolvedCount > 0 && (
          <Card title="Alerte — séances non résolues">
            <p className="text-sm text-ink-600">
              La dernière génération comporte <strong>{stats.lastRun.unresolvedCount}</strong> séance(s) non
              placée(s). Retournez à l'étape 5 pour voir le détail, ou ajustez les disponibilités des professeurs
              concernés.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function statusLabel(status: string) {
  if (status === "SUCCESS") return "Réussie";
  if (status === "PARTIAL") return "Partielle";
  return "Échouée";
}
