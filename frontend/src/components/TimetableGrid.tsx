import { DAY_NAMES, TimetableSessionDto } from "../types";

interface Props {
  sessions: TimetableSessionDto[];
  workDays: number[]; // ex: [0,1,2,3,4]
  slotRows: { order: number; startTime: string; endTime: string }[];
  /** Comment afficher le contenu d'une cellule occupée */
  renderLabel: (s: TimetableSessionDto) => string;
}

export default function TimetableGrid({ sessions, workDays, slotRows, renderLabel }: Props) {
  const cellMap = new Map<string, TimetableSessionDto>();
  for (const s of sessions) cellMap.set(`${s.dayOfWeek}::${s.order}`, s);

  if (slotRows.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-line rounded-md text-ink-400 text-sm">
        Aucun créneau horaire configuré pour l'établissement.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-line rounded-md">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-ink text-white font-medium text-left px-3 py-2.5 w-28">Heure</th>
            {workDays.map((d) => (
              <th key={d} className="bg-ink text-white font-medium px-3 py-2.5 min-w-[140px]">
                {DAY_NAMES[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slotRows.map((slot) => (
            <tr key={slot.order} className="border-t border-line">
              <td className="px-3 py-3 font-medium text-ink-600 whitespace-nowrap bg-canvas/60">
                {slot.startTime} – {slot.endTime}
              </td>
              {workDays.map((d) => {
                const content = cellMap.get(`${d}::${slot.order}`);
                return (
                  <td key={d} className="px-2 py-2 border-l border-line align-top">
                    {content ? (
                      <div
                        className="rounded px-2 py-1.5 text-white text-xs leading-snug"
                        style={{ backgroundColor: content.subjectColor ?? "#C08A2E" }}
                      >
                        {renderLabel(content)}
                      </div>
                    ) : (
                      <div className="h-8" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
