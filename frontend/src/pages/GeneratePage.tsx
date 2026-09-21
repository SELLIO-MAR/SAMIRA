import { useState } from "react";
import Layout from "../components/Layout";
import { Card, Button } from "../components/ui";
import { api } from "../api/client";
import { GenerationResponse } from "../types";

export default function GeneratePage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.post<GenerationResponse>("/timetable/generate");
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Layout
      title="Étape 5 · Génération automatique"
      description="Le moteur d'optimisation calcule un emploi du temps respectant les volumes horaires, les disponibilités et les contraintes de conflit."
      actions={
        <Button onClick={handleGenerate} disabled={running}>
          {running ? "Génération en cours…" : "Lancer la génération"}
        </Button>
      }
    >
      <div className="max-w-3xl space-y-6">
        <Card title="Contraintes appliquées par le moteur">
          <ul className="text-sm text-ink-600 space-y-1.5 list-disc pl-5">
            <li>Respect des volumes horaires hebdomadaires par matière et par niveau.</li>
            <li>Respect des disponibilités et indisponibilités déclarées pour chaque professeur.</li>
            <li>Aucun professeur sur deux classes en même temps.</li>
            <li>Aucune classe avec deux matières en même temps.</li>
            <li>Respect du nombre maximum de séances par jour et des pauses définies.</li>
            <li>
              Une même matière ne dépasse jamais le nombre maximum d'heures par jour défini à
              l'Étape 1 (ex : pas plus de 2h de Maths le même jour pour une classe).
            </li>
            <li>Aucune séance placée sur un jour ou une demi-journée de repos d'un niveau (Étape 2).</li>
            <li>
              Priorité forte à l'emploi du temps du professeur sans heures creuses : ses séances
              d'une même journée sont regroupées pour qu'il n'ait pas à attendre entre deux cours.
            </li>
            <li>Répartition des cours sur la semaine et réduction des heures creuses côté classe (optimisation).</li>
          </ul>
        </Card>

        {error && (
          <Card>
            <p className="text-sm text-red-600">{error}</p>
          </Card>
        )}

        {result && (
          <Card
            title={
              result.status === "SUCCESS"
                ? "✅ Génération réussie"
                : result.status === "PARTIAL"
                ? "⚠️ Génération partielle"
                : "❌ Échec de la génération"
            }
          >
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">{result.placedCount}</span> séance(s) placée(s) avec un score de
                qualité de <span className="font-medium">{result.score.toFixed(1)}</span> (plus proche de 0 =
                meilleure répartition, moins d'heures creuses).
              </p>

              {result.missingAssignments.length > 0 && (
                <div>
                  <p className="font-medium text-ink mt-3">Affectations manquantes :</p>
                  <ul className="list-disc pl-5 text-ink-600">
                    {result.missingAssignments.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                  <p className="text-ink-400 mt-1">
                    Affectez un professeur enseignant cette matière à ces classes (Étape 4), puis relancez la
                    génération.
                  </p>
                </div>
              )}

              {result.unresolved.length > 0 && (
                <div>
                  <p className="font-medium text-ink mt-3">
                    Séances non placées ({result.unresolved.length}) :
                  </p>
                  <ul className="list-disc pl-5 text-ink-600">
                    {result.unresolved.map((u, i) => (
                      <li key={i}>
                        {u.classe} — {u.matiere} ({u.professeur})
                      </li>
                    ))}
                  </ul>
                  <p className="text-ink-400 mt-1">
                    Essayez d'élargir les disponibilités du professeur concerné ou de revoir le volume horaire.
                  </p>
                </div>
              )}

              {result.status === "SUCCESS" && result.unresolved.length === 0 && (
                <p className="text-ink-600">
                  Consultez les emplois du temps générés dans les sections « Emplois du temps ».
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
