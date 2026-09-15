import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Tableau de bord", end: true },
  { to: "/etablissement", label: "1 · Établissement" },
  { to: "/classes", label: "2 · Niveaux & classes" },
  { to: "/matieres", label: "3 · Matières" },
  { to: "/professeurs", label: "4 · Professeurs" },
  { to: "/generation", label: "5 · Génération" },
  { to: "/emplois-classes", label: "Emplois du temps — Classes" },
  { to: "/emplois-professeurs", label: "Emplois du temps — Professeurs" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-ink text-white flex flex-col">
      <div className="px-6 py-6 border-b border-white/10">
        <p className="font-serif text-lg leading-tight">Gestion Scolaire</p>
        <p className="text-xs text-ink-200/70 mt-1">Emplois du temps automatisés</p>
      </div>
      <nav className="flex-1 py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `block px-6 py-2.5 text-sm border-l-2 transition-colors ${
                isActive
                  ? "border-gold text-white bg-white/5"
                  : "border-transparent text-white/70 hover:text-white hover:bg-white/5"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-6 py-4 text-xs text-white/40 border-t border-white/10">
        Moteur d'optimisation intégré
      </div>
    </aside>
  );
}
