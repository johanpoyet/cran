# Cran

[![CI](https://github.com/johanpoyet/cran/actions/workflows/ci.yml/badge.svg)](https://github.com/johanpoyet/cran/actions/workflows/ci.yml)

Ta prise de masse, un cran après l'autre.

Cran is a native mobile app for tracking calories and macros during a lean bulk, with a target that adjusts every week from your real weight trend. Local-first Expo app, self-hosted Hono API, shared TypeScript business rules.

> Work in progress. See [`docs/SPEC.md`](docs/SPEC.md) for the full specification and [`docs/STATUS.md`](docs/STATUS.md) for progress.

## Getting started

Requires Node 22+ and corepack.

```sh
corepack enable
pnpm install
pnpm lint && pnpm typecheck && pnpm test
```

### API

```sh
cp apps/api/.env.example apps/api/.env   # point DATABASE_URL to a Postgres 16
pnpm --filter @cran/api db:migrate
pnpm --filter @cran/api dev              # http://localhost:3000/health, /docs
```

Tests that need Postgres run when `DATABASE_URL` is set (always in CI). The production image is built from the repository root with `docker build -f apps/api/Dockerfile .`.

### Mobile app

```sh
pnpm --filter @cran/mobile ios       # dev build on the iOS simulator (Xcode required): expo run:ios
pnpm --filter @cran/mobile start     # Metro for an installed development build
pnpm --filter @cran/mobile test      # Jest + React Native Testing Library
```

Builds for devices go through EAS (`eas build --profile preview`); see `apps/mobile/eas.json`.

## Structure

| Path              | Content                                              |
| ----------------- | ---------------------------------------------------- |
| `apps/mobile`     | Expo app (React Native, Expo Router)                 |
| `apps/api`        | Hono API on Node 22                                  |
| `packages/shared` | Zod schemas, types, calculations, French formatting  |
| `packages/config` | Shared tsconfig, ESLint and Prettier                 |
| `docs/`           | Spec, status, architecture decisions, design mockups |
