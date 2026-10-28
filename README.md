# Cran

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

## Structure

| Path              | Content                                              |
| ----------------- | ---------------------------------------------------- |
| `apps/mobile`     | Expo app (React Native, Expo Router)                 |
| `apps/api`        | Hono API on Node 22                                  |
| `packages/shared` | Zod schemas, types, calculations, French formatting  |
| `packages/config` | Shared tsconfig, ESLint and Prettier                 |
| `docs/`           | Spec, status, architecture decisions, design mockups |
