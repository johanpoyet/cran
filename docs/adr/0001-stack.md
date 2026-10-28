# ADR 0001 — Stack et organisation du monorepo

- Statut : accepté
- Date : 2026-10-28

## Contexte

Cran est une app mobile native (iOS puis Android) avec une API auto-hébergée sur un seul VPS. Les règles métier (cible calorique, macros, tendance de poids, maintien adaptatif) doivent être identiques dans l'app, qui fonctionne hors-ligne, et dans l'API. Le projet sert aussi de vitrine portfolio : code typé de bout en bout, tests, CI/CD.

## Décision

Un monorepo TypeScript géré par **pnpm workspaces** et **Turborepo** :

| Workspace         | Rôle                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `apps/mobile`     | app Expo (React Native), Expo Router, SQLite local + Drizzle                 |
| `apps/api`        | API Hono sur Node 22, PostgreSQL 16 + Drizzle                                |
| `packages/shared` | schémas Zod, types, calculs, formatage français ; importé par l'app et l'API |
| `packages/config` | tsconfig, ESLint et Prettier partagés                                        |

Choix associés :

- **TypeScript `strict`** partout, avec `noUncheckedIndexedAccess` et `exactOptionalPropertyTypes`.
- **Paquets internes consommés en source** (`exports` vers `src/index.ts`), sans build intermédiaire : Metro et Vitest compilent le TypeScript eux-mêmes, l'API sera bundlée pour son image Docker. `moduleResolution: Bundler` dans toutes les configs.
- **Outillage** : pnpm 12 épinglé par `packageManager` (corepack), Turborepo 2 pour orchestrer `lint`, `typecheck` et `test` avec cache, ESLint 10 en flat config avec typescript-eslint (`strictTypeChecked`), Prettier 3, Husky + lint-staged avant chaque commit, Vitest pour `shared` et l'API.
- **Node 22 LTS** comme cible d'exécution (`.nvmrc`, `engines`, image `node:22-alpine`).

## Écart à la spec

La spec ne fixe pas de version de TypeScript. **TypeScript 6.0** est retenu plutôt que la 7.0 (compilateur natif), car typescript-eslint 8 ne supporte que TypeScript < 6.1. On passera à TS 7 quand le lint typé le supportera.

## Conséquences

- Un seul `pnpm install` et trois commandes à la racine (`pnpm lint`, `pnpm typecheck`, `pnpm test`) pour tout vérifier, en local comme en CI.
- Les calculs sont écrits et testés une seule fois dans `shared`.
- Pas d'étape de build pour `shared` : un changement est visible immédiatement dans l'app et l'API, mais `shared` ne doit utiliser aucune API propre à Node ou à React Native (pas de types `node` dans son tsconfig).
- Turborepo a besoin d'un binaire `pnpm` dans le `PATH` : `corepack enable` fait partie de la mise en route.
