# CLAUDE.md

Cran is a native mobile app (Expo) for tracking calories and macros during a lean bulk, with a self-hosted Hono API. The source of truth is [`docs/SPEC.md`](docs/SPEC.md); mockups are in [`docs/design/`](docs/design/) and take precedence over any other visual description.

## Working rules

1. **One sprint at a time, one story at a time.** One story = one branch `feat/S<n>-<slug>` = one pull request, with its tests.
2. A story is done only when it meets the Definition of Done below and all of its acceptance criteria (spec section 11).
3. Keep [`docs/STATUS.md`](docs/STATUS.md) up to date (current sprint, finished stories, decisions). Add an ADR in [`docs/adr/`](docs/adr/) for any technical decision that departs from the spec.
4. If an ambiguity changes the data model, the API or the UX: ask before coding. For an inconsequential detail: choose, and note it in `STATUS.md`.
5. **Production VPS**: never run a command that modifies the server, Dokploy or a database without Johan's explicit approval. Read-only access is allowed.
6. **Git**: Conventional Commits, in English. No mention of Claude in commits or PRs (no `Co-Authored-By`, no "Generated with" signature).

## Conventions

- TypeScript `strict`, no `any` (ESLint forbids it), Prettier, sorted imports.
- Naming: files in kebab-case, components in PascalCase, code and commits in English, UI text in French via i18n (`fr.json`, no hard-coded strings in components).
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`). One PR per story using [`.github/pull_request_template.md`](.github/pull_request_template.md) (context, changes, screenshots, tests).
- Husky + lint-staged run lint and format before each commit.
- Business calculations live in `packages/shared/src/calc/` as pure functions, shared by app and API.

## Tests

| Layer                    | Tool                                | Requirement                                                                                                               |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `shared` (calc, schemas) | Vitest                              | 100 % of `calc/` functions, spec section 6 examples as test cases                                                         |
| API                      | Vitest + test Postgres              | every route: nominal, validation, unauthenticated, **isolation between two users**; sync: idempotence and last-write-wins |
| Mobile components        | Jest + React Native Testing Library | `ui/` components and add-sheet logic                                                                                      |
| Mobile end-to-end        | Maestro                             | onboarding, add recent food, scan a product, add a recipe portion, log a weigh-in                                         |

Target coverage: 80 % on `shared` and `api`.

## Definition of Done (story)

- [ ] All acceptance criteria verified.
- [ ] Lint, typecheck and tests green in CI.
- [ ] Tests added for new logic.
- [ ] Matches mockups and tokens; touch targets (≥ 44 × 44 pt) and accessibility labels checked.
- [ ] Works offline if the story touches user data.
- [ ] Texts in `fr.json`, no hard-coded strings.
- [ ] `docs/STATUS.md` updated; ADR if a decision departs from the spec.
- [ ] PR reviewed and merged; deployed to staging for API changes.

## Commands

pnpm is pinned through `packageManager`; run `corepack enable` once so that `pnpm` (and Turborepo) find the right version.

```sh
pnpm install
pnpm lint        # ESLint in every workspace
pnpm typecheck   # tsc --noEmit in every workspace
pnpm test        # Vitest / Jest in every workspace
pnpm format      # Prettier
```

Run a command in a single workspace with `pnpm --filter @cran/<name> <script>` (`api`, `mobile`, `shared`, `config`).

## Repo layout

```
apps/mobile       Expo (React Native), Expo Router
apps/api          Hono on Node 22
packages/shared   Zod schemas, types, nutrition/target calculations, French formatting
packages/config   shared tsconfig, ESLint, Prettier
docs/             SPEC, STATUS, ADRs, runbook, design mockups
```
