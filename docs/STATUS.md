# Avancement

## Sprint en cours : S0 — Fondations

| Story                    | État     | PR             |
| ------------------------ | -------- | -------------- |
| S0-1 Monorepo            | fait     | #1             |
| S0-2 CI                  | en revue | `feat/S0-2-ci` |
| S0-3 API squelette       | à faire  |                |
| S0-4 Déploiement staging | à faire  |                |
| S0-5 App squelette       | à faire  |                |

## Décisions

Petites décisions prises sans changer le modèle de données, l'API ou l'UX. Les décisions qui s'écartent de la spec ont leur ADR dans `docs/adr/`.

- **2026-10-28 · Versions d'outillage** : pnpm 12 (épinglé via `packageManager` + corepack), Turborepo 2, ESLint 10 (flat config), Vitest 5. TypeScript 6.0 plutôt que 7 : typescript-eslint ne supporte pas encore TS 7 (voir ADR 0001).
- **2026-10-28 · Paquets internes en source TypeScript** : `@cran/shared` exporte directement `src/index.ts`, sans étape de build. Metro (app) et Vitest le consomment tel quel ; l'API sera bundlée pour l'image Docker (S0-3). Toutes les configs utilisent `moduleResolution: Bundler`.
- **2026-10-28 · Placeholders** : `apps/api` et `apps/mobile` ne contiennent qu'un point d'entrée vide en S0-1 ; Hono arrive en S0-3, Expo en S0-5. Seul `shared` a des tests (formatage français des nombres, utile dès S1).
- **2026-10-28 · ESLint** : `strictTypeChecked` + `stylisticTypeChecked` de typescript-eslint, `simple-import-sort` pour le tri des imports, `eslint-config-prettier` pour éviter les conflits.
- **2026-10-28 · Prettier** n'est pas appliqué à `docs/SPEC.md` (gardé tel que fourni) ni à `docs/design/`.
- **2026-10-28 · Formatage français** : `Intl.NumberFormat('fr-FR')`, qui utilise une espace fine insécable (U+202F) comme séparateur de milliers ; l'unité est séparée par une espace insécable (U+00A0).

## Rétros

_Aucune pour l'instant._
