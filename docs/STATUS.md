# Avancement

## Sprint en cours : S0 — Fondations

| Story                    | État                                    | PR                         |
| ------------------------ | --------------------------------------- | -------------------------- |
| S0-1 Monorepo            | fait                                    | #1                         |
| S0-2 CI                  | fait                                    | #2                         |
| S0-3 API squelette       | fait                                    | #4                         |
| S0-4 Déploiement staging | en revue (checklist Dokploy à exécuter) | `feat/S0-4-staging-deploy` |
| S0-5 App squelette       | à faire                                 |                            |

## Décisions

Petites décisions prises sans changer le modèle de données, l'API ou l'UX. Les décisions qui s'écartent de la spec ont leur ADR dans `docs/adr/`.

- **2026-10-28 · Versions d'outillage** : pnpm 12 (épinglé via `packageManager` + corepack), Turborepo 2, ESLint 10 (flat config), Vitest 5. TypeScript 6.0 plutôt que 7 : typescript-eslint ne supporte pas encore TS 7 (voir ADR 0001).
- **2026-10-28 · Paquets internes en source TypeScript** : `@cran/shared` exporte directement `src/index.ts`, sans étape de build. Metro (app) et Vitest le consomment tel quel ; l'API sera bundlée pour l'image Docker (S0-3). Toutes les configs utilisent `moduleResolution: Bundler`.
- **2026-10-28 · Placeholders** : `apps/api` et `apps/mobile` ne contiennent qu'un point d'entrée vide en S0-1 ; Hono arrive en S0-3, Expo en S0-5. Seul `shared` a des tests (formatage français des nombres, utile dès S1).
- **2026-10-28 · ESLint** : `strictTypeChecked` + `stylisticTypeChecked` de typescript-eslint, `simple-import-sort` pour le tri des imports, `eslint-config-prettier` pour éviter les conflits.
- **2026-10-28 · Prettier** n'est pas appliqué à `docs/SPEC.md` (gardé tel que fourni) ni à `docs/design/`.
- **2026-10-28 · Formatage français** : `Intl.NumberFormat('fr-FR')`, qui utilise une espace fine insécable (U+202F) comme séparateur de milliers ; l'unité est séparée par une espace insécable (U+00A0).
- **2026-10-28 · CI** : un seul job « Lint, typecheck, test » (une seule installation pnpm), qui lance aussi `format:check`. Postgres 16 en service container, exposé aux tests via `DATABASE_URL` (déclarée dans `turbo.json` pour passer le mode strict des variables d'environnement de Turborepo). La CI tourne sur les PR et sur `main`.
- **2026-10-28 · Dépôt public et protection de `main`** : dépôt passé en public par Johan (protection de branche gratuite sur un dépôt public). Le ruleset « Protect main » impose de passer par une PR, exige le check « Lint, typecheck, test » et interdit le force-push et la suppression, sans contournement. Vérifié avec la PR #3 (erreur de type volontaire → CI rouge, PR `BLOCKED`, fermée sans merge).
- **2026-10-28 · API : structure** : `createApp(deps)` reçoit ses dépendances (logger, version, ping de la base) pour être testée sans serveur ni base ; `src/index.ts` assemble le tout. Les tests qui demandent un vrai Postgres sont sautés si `DATABASE_URL` est absente (en local sans Docker) et tournent toujours en CI.
- **2026-10-28 · API : format d'erreur** : toutes les erreurs ont la forme `{ error: { code, message, details? } }` (`not_found`, `validation_error`, `payload_too_large`, `internal_error`…).
- **2026-10-28 · API : `/health`** : 200 `{ status: "ok", version, uptimeSeconds, database: { status: "up", latencyMs } }`, ou 503 avec `status: "degraded"` si la base ne répond pas en 2 s. Le `HEALTHCHECK` Docker ne vérifie que la vivacité (toute réponse HTTP suffit) : une base en panne ne doit pas faire redémarrer le conteneur en boucle ; c'est Uptime Kuma qui alerte sur le 503.
- **2026-10-28 · API : sécurité de base** : `secureHeaders`, corps limité à 1 Mo (413), identifiant de requête. Le rate limiting arrive avec l'auth (S1-2).
- **2026-10-28 · API : logs** : une ligne pino par requête avec méthode, chemin, statut, durée et `requestId` ; jamais la query string ni le corps.
- **2026-10-28 · Sentry 11** : l'option `sendDefaultPii` citée par la spec n'existe plus ; remplacée par `dataCollection`, réglée au plus strict (pas d'utilisateur, cookies, corps, query string, données SQL ni variables locales ; en-têtes limités à `content-type`, `user-agent`, `x-request-id`). Sentry n'est actif que si `SENTRY_DSN` est défini.
- **2026-10-28 · Migrations** : journal Drizzle vide (`apps/api/drizzle`) tant qu'il n'y a pas de table ; la première migration arrivera avec Better Auth (S1-2). Le conteneur lance `migrate.js` puis le serveur.
- **2026-10-28 · Image Docker** : bundle tsdown (les paquets `@cran/*` sont inclus, donc `@cran/shared` est une dépendance de dev de l'API) + `pnpm deploy --prod` pour les `node_modules` de production. Un job CI construit l'image, la lance contre Postgres et vérifie `/health` et l'utilisateur non root.
- **2026-10-28 · pnpm** : les scripts de build sont bloqués par défaut ; seul `esbuild` est autorisé (`allowBuilds`). On respecte la politique d'âge minimal des versions : tsdown 0.23.1 plutôt que 0.23.3, publiée la veille.
- **2026-10-28 · Déploiement staging** : workflow `deploy-staging.yml` sur push `main` filtré par chemins (API, `shared`, `config`, dépendances) : un merge qui ne touche que la doc ou l'app mobile ne redéploie pas l'API. Tags GHCR `main` et SHA complet ; le SHA est inscrit dans l'image et renvoyé par `/health`, ce qui permet au workflow d'attendre que la nouvelle version réponde réellement en staging. Sans le secret `DOKPLOY_STAGING_WEBHOOK_URL`, l'image est poussée et le déploiement sauté avec un avertissement (nécessaire pour la toute première image).
- **2026-10-28 · Mémoire Node** : `NODE_OPTIONS=--max-old-space-size=128` en staging pour rester sous la limite de 192 Mo du conteneur (à ajuster pour la prod, 256 Mo).

## Rétros

_Aucune pour l'instant._
