# Plateforme de gestion scolaire — Emplois du temps automatisés

Génération automatique des emplois du temps de classes, des tableaux de
service des enseignants, des emplois du temps individuels, et des
statistiques de l'établissement — avec exports PDF/Excel.

**Stack** : React + TypeScript + Tailwind CSS (frontend) · Node.js + Express
+ TypeScript + PostgreSQL/Prisma (backend).

## Structure du projet

```
school-scheduler/
├── backend/       API REST + moteur de génération d'emplois du temps
└── frontend/      Interface d'administration (React)
```

## 1. Prérequis

- Node.js 18+ et npm
- PostgreSQL 14+ (local ou distant)

## 2. Installation du backend

```bash
cd backend
cp .env.example .env
# Modifiez DATABASE_URL dans .env avec vos identifiants PostgreSQL
npm install
npm run prisma:migrate      # crée les tables en base
npm run seed                # (optionnel) insère des données d'exemple
npm run dev                 # démarre l'API sur http://localhost:4000
```

## 3. Installation du frontend

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev                 # démarre l'interface sur http://localhost:5173
```

Le frontend est déjà configuré (`vite.config.ts`) pour rediriger les appels
`/api/*` vers `http://localhost:4000`.

## 4. Utilisation

Suivez les étapes dans la barre latérale, dans l'ordre :

1. **Établissement** — jours travaillés, horaires, pauses, nb max de séances/jour.
2. **Niveaux & classes** — créez vos niveaux (1AC, TC, 1BAC SM…) puis vos classes.
3. **Matières** — créez les matières et leur volume horaire hebdomadaire par niveau.
4. **Professeurs** — nom, matière, classes attribuées, disponibilités.
5. **Génération** — lancez le moteur d'optimisation automatique.
6. **Emplois du temps** — consultez et exportez (PDF/Excel/impression) les
   emplois du temps par classe ou par professeur, ainsi que la fiche de
   service de chaque professeur.

Le tableau de bord (page d'accueil) affiche les statistiques globales de
l'établissement (effectifs, volumes horaires, répartition par matière/niveau).

## 5. Le moteur de génération

Le moteur (`backend/src/services/scheduler.service.ts`) modélise le problème
comme un CSP (Constraint Satisfaction Problem) :

- **Contraintes dures** (jamais violées) : volumes horaires respectés,
  disponibilités des professeurs respectées, aucun conflit professeur/classe,
  nombre maximum de séances par jour respecté.
- **Contraintes souples** (optimisées) : réduction des heures creuses,
  répartition des matières sur la semaine.

Il combine un tri **MRV** (les séances les plus contraintes sont placées en
premier), un **backtracking** avec plusieurs tentatives aléatoires, et un
**repli glouton** si le temps imparti est dépassé — dans ce cas, les séances
qui n'ont pas pu être placées sont listées clairement pour permettre un
ajustement manuel (élargir une disponibilité, revoir un volume horaire...).

## 6. Notes de mise en production

- Ajoutez une authentification (ex: JWT) avant toute mise en production —
  cette base ne protège pas encore les routes de l'API.
- Le modèle actuel suppose qu'un seul professeur enseigne une matière donnée
  à une classe donnée. Pour gérer plusieurs professeurs sur la même
  matière/classe (co-enseignement, groupes de niveau), étendez le modèle
  `TeacherAssignment`.
- Les exports PDF/Excel sont générés à la volée par l'API ; pour de très gros
  établissements, envisagez une file d'attente (ex: BullMQ) si les temps de
  génération deviennent longs.
