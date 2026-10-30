# Avancement

## Sprint en cours : S1 — Compte, profil, onboarding

| Story                               | État     | PR                               |
| ----------------------------------- | -------- | -------------------------------- |
| S1-1 Calculs initiaux dans `shared` | en revue | `feat/S1-1-initial-calculations` |
| S1-2 Auth API                       | à faire  |                                  |
| S1-3 Auth app                       | à faire  |                                  |
| S1-4 Profil                         | à faire  |                                  |
| S1-5 Onboarding                     | à faire  |                                  |

## Sprints terminés

### S0 — Fondations (clos le 2026-10-30)

| Story                    | État | PR         |
| ------------------------ | ---- | ---------- |
| S0-1 Monorepo            | fait | #1         |
| S0-2 CI                  | fait | #2         |
| S0-3 API squelette       | fait | #4         |
| S0-4 Déploiement staging | fait | #5, #6, #7 |
| S0-5 App squelette       | fait | #8         |

Démo : [`docs/demo/sprint-0.gif`](demo/sprint-0.gif) (build `preview` sur l'iPhone de Johan).

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
- **2026-10-29 · nginx devant Traefik** : sur le VPS, un nginx hôte occupe les ports 80/443 et termine le TLS (certificats certbot) ; Traefik n'est joignable qu'en local sur `127.0.0.1:8080`. Le domaine `api-staging.cran.johanpoyet.fr` a donc un bloc nginx qui renvoie vers Traefik, et le domaine Dokploy est en HTTP seul. Mis en place avec l'accord de Johan, documenté dans `docs/runbook.md`. Même schéma à prévoir pour `api.cran.johanpoyet.fr` en S9-3.
- **2026-10-29 · Staging en ligne** : `https://api-staging.cran.johanpoyet.fr/health` renvoie `status: ok` et `database: up` (critère de S0-3 vérifié). Le webhook Dokploy redéploie bien le conteneur (`uptimeSeconds` remis à zéro par le workflow lancé à la main). Il reste à constater le redéploiement automatique sur un vrai merge touchant l'API.
- **2026-10-30 · Bloc nginx par défaut** : `00-default` (`default_server`, `ssl_reject_handshake on`, `return 444`) ferme les connexions pour les domaines non déclarés ; avant, nginx servait Budget pour n'importe quel hôte (PR #7).
- **2026-10-30 · App : versions** : Expo SDK 58 (React 19.3, React Native 0.88, New Architecture seule), versions natives alignées sur `bundledNativeModules.json` du SDK. Le monorepo pnpm en mode isolé fonctionne avec Metro sans configuration particulière (`expo export` vérifié). `react-dom` 19.3.0 est épinglé (dépendance d'Expo Router).
- **2026-10-30 · App : structure** : routes dans `src/app` (Expo Router), tokens dans `src/theme/tokens.ts`, composants dans `src/ui`, textes dans `src/i18n/fr.json` avec des clés typées. Aucun test dans `src/app` : Expo Router y traiterait le fichier comme une route.
- **2026-10-30 · App : composants livrés en S0-5** : `Text`, `Screen`, `Card`, `HeroCard`, `PrimaryButton`, `Chip`, `ProgressBar`, `MacroRing`, `EmptyState`, `TabBar`. `Segmented`, `Stepper`, `Sheet`, `ListRow` et `Toggle` arrivent avec leur premier écran (onboarding, S1-5), pour être construits sur un vrai cas d'usage.
- **2026-10-30 · App : typographie** : échelle mesurée sur les maquettes @2x (display 44/800, title 28/800, heading 20/700, body 16/500, label 15/600, caption 13/500). Une famille de police par graisse, car `fontWeight` ne choisit pas le fichier d'une police personnalisée.
- **2026-10-30 · App : icônes** : `lucide-react-native` (sur `react-native-svg`, déjà prévu par la spec) : maison, barres, plus, poids, utilisateur, proches de la maquette.
- **2026-10-30 · App : TabBar** : composant indépendant du navigateur (`active`, `onNavigate`, `onAdd`), branché dans `(tabs)/_layout.tsx` via `navigateToTab` (API d'Expo Router 58). Barre flottante de 68 pt à 20 pt des bords, à `max(inset bas − 10, 16)` du bas (24 pt sur iPhone avec Face ID, comme la maquette). Le « + » ouvre la route `add` en `formSheet` ; le choix du repas selon l'heure arrive en S3-2.
- **2026-10-30 · App : accessibilité** : cibles d'au moins 44 × 44 pt, `accessibilityLabel` sur les boutons icônes, rôles `tab`/`tablist`/`progressbar`/`header`, taille de texte dynamique laissée active. Les contrastes des paires de tokens utilisées pour du texte sont vérifiés par un test (≥ 4,5:1).
- **2026-10-30 · App : Sentry** : actif seulement si `EXPO_PUBLIC_SENTRY_DSN` est défini. Le SDK React Native 8 n'expose pas encore `dataCollection` : `sendDefaultPii: false` reste le seul réglage (et la valeur par défaut). L'envoi des source maps est désactivé (`SENTRY_DISABLE_AUTO_UPLOAD`) jusqu'à la création du projet Sentry.
- **2026-10-30 · App : EAS** : profils `development` (client de dev), `preview` (distribution interne, API staging) et `production` (API prod, numéro de build auto-incrémenté), canaux EAS Update du même nom, `runtimeVersion` liée à la version de l'app. Projet EAS `@johanpoyet/cran` (ID inscrit dans `app.config.ts` : `eas init` ne peut pas écrire dans une config dynamique).
- **2026-10-30 · App : icônes de l'app** : `pnpm --filter @cran/mobile icons` génère l'icône adaptative Android (logo blanc dans la zone de sécurité, fond `#3554F5`) et l'image de démarrage depuis `docs/design/logo/app-icon.svg` ; l'icône iOS est l'export 1024 px des maquettes. Écran de démarrage bleu avec le logo blanc, comme l'icône.
- **2026-10-30 · App : tests** : Jest (`jest-expo`) et React Native Testing Library 14, dont `render` et `fireEvent` sont asynchrones. `lucide-react-native` est résolu vers sa version CommonJS dans Jest (son entrée `react-native` est un `.mjs` non transformé).
- **2026-10-30 · pnpm** : `@sentry/cli`, `@parcel/watcher` et `unrs-resolver` sans script d'installation (binaires fournis par des dépendances optionnelles). Versions publiées depuis moins d'un jour refusées par pnpm : `i18next` 26.5.11 et `lucide-react-native` 1.63.0 plutôt que les toutes dernières.
- **2026-10-30 · Redéploiement automatique vérifié** : le merge de la PR #8 (qui touche `packages/shared`) a déclenché « Deploy staging » sans action manuelle ; `/health` a renvoyé le SHA du merge `7fa005a` avec la base `up` (critère de S0-4 vérifié).
- **2026-10-30 · Validation de l'app par checklist** : à la demande de Johan, la vérification des écrans se fait désormais avec une liste de comportements à tester sur son iPhone (OK / pas OK), au lieu d'une démo enregistrée. Cela remplace la « démo enregistrée » de la Definition of Done d'un sprint (spec section 9) à partir du sprint 1.
- **2026-10-30 · Build `preview` sur iPhone** : iPhone de Johan enregistré par son UDID (saisie manuelle dans `eas device:create`, ce qui évite le délai de sécurité d'iOS pour installer un profil hors d'un lieu habituel). Build EAS `preview` installé : l'écran « Ta journée » et la barre flottante s'affichent comme sur la maquette (critère de S0-5 vérifié).
- **2026-10-30 · Calculs : arrondi des glucides** : protéines et lipides arrondis au gramme le plus proche (comme le dit la spec), glucides arrondis **à l'inférieur**. C'est la seule règle qui redonne l'exemple de référence (68,4 kg, 2 900 kcal → 150 / 86 / **381** ; l'arrondi au plus proche donnerait 382), et elle garantit que les macros ne dépassent jamais la cible.
- **2026-10-30 · Calculs : maquette « Objectifs »** : elle affiche 85 g de lipides et 384 g de glucides pour 2 900 kcal, ce qui ne correspond pas aux règles de la section 6 ni à la maquette « Ta cible » (86 / 381). Pour les chiffres, la spec fait foi ; les maquettes priment seulement pour le visuel.
- **2026-10-30 · Calculs : âge** : le profil ne stocke que l'année de naissance ; l'âge est l'âge atteint dans l'année civile en cours (2026 − 2005 = 21 ans, comme dans la maquette « Onboarding 2 »).
- **2026-10-30 · Calculs : entrées invalides** : poids, taille, âge, cible ou ratios nuls, négatifs ou non finis lèvent une `RangeError`, plutôt que de produire une cible `NaN` silencieuse. Une cible trop basse pour couvrir protéines et lipides est aussi refusée.
- **2026-10-30 · Couverture** : `pnpm test` de `shared` lance Vitest avec couverture v8 et seuils bloquants : 100 % sur `src/calc/**`, 80 % sur le paquet. Le badge de couverture du README viendra quand l'API aura aussi ses seuils.

## Rétros

### S0 — Fondations

- **Bien** : monorepo, CI, API et app en place en 3 jours ; staging redéployé automatiquement ; app sur l'iPhone dès le sprint 0.
- **À améliorer** : particularité du VPS non documentée (nginx devant Traefik) découverte en cours de route ; outils très récents (pnpm 12, Sentry 11, Expo 58) qui ont demandé des ajustements.
- **À essayer** : documenter le VPS avant de s'en servir ; prévoir un temps « comptes et accès » (Apple, Expo, Sentry) en début de sprint.
