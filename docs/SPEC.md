# Cran — Spécification projet

Oct 28, 2026 · @Johan

Cran est une app mobile native (iOS puis Android) de suivi des calories et macros pour une prise de masse progressive, avec un backend auto-hébergé sur un seul VPS. Ce document est la source de vérité pour la développer sprint par sprint ; il sera donné tel quel à Claude Code.

## Mode d'emploi pour Claude

1. Lis tout le document avant d'écrire du code. Les sections 3 à 10 sont des contraintes ; la section 11 est l'ordre de travail.
2. Travaille **un sprint à la fois, une story à la fois**. Une story = une branche `feat/S<n>-<slug>` = une pull request, avec ses tests.
3. Une story est terminée seulement quand elle respecte la Definition of Done (section 9) et tous ses critères d'acceptation.
4. Tiens à jour `docs/STATUS.md` (sprint en cours, stories faites, décisions prises) et ajoute un ADR dans `docs/adr/` pour toute décision technique qui s'écarte de ce document.
5. En cas d'ambiguïté qui change le modèle de données, l'API ou l'UX : pose la question avant de coder. Pour un détail sans conséquence : choisis, note-le dans `STATUS.md`.
6. **VPS de production** : ne lance jamais une commande qui modifie le serveur, Dokploy ou une base de données sans l'accord explicite de Johan. Lecture seule autorisée.
7. **Git** : messages au format Conventional Commits, en anglais. Aucune mention de Claude dans les commits ni les PR (pas de `Co-Authored-By`, pas de signature « Generated with »).
8. Référence visuelle : les maquettes « B — Clair & doux » du canevas [Tracker prise de masse — DA](https://claude.ai/artifact/R5kozVjydQSEnztrgoZaBy). Les tokens de la section 7 en sont extraits ; en cas d'écart, les maquettes priment.
9. Crée en sprint 0 un `CLAUDE.md` à la racine du repo qui reprend les règles 2 à 7 et les conventions de la section 9.

## 1. Contexte et objectifs

L'objectif utilisateur est de prendre environ 1 kg par mois (≈ +250 kcal/jour au-dessus du maintien), sans tout peser au gramme près pendant des mois. L'app doit rendre la saisie quotidienne très rapide et ajuster la cible toute seule à partir de la vraie courbe de poids.

**Utilisateurs cibles**

- Pratiquants de musculation en prise de masse « propre », francophones en priorité.
- Profil type : s'entraîne 3 à 5 fois par semaine, fait du meal prep, veut suivre surtout calories et protéines.
- Premier utilisateur : Johan, ce qui sert de test réel dès les premiers sprints.

**Objectifs produit**

| Objectif | Mesure de réussite |
| --- | --- |
| Saisie rapide | Ajouter un aliment récent en 3 taps ou moins ; un repas modèle en 2 taps |
| Fiabilité hors-ligne | Toute saisie fonctionne sans réseau et se synchronise au retour |
| Objectif juste | La cible kcal s'ajuste chaque semaine selon le poids réel (règles en section 6) |
| Qualité portfolio | Code typé de bout en bout, tests, CI/CD, docs d'architecture, publication sur les stores |

**Objectifs techniques (vitrine portfolio)**

- Monorepo TypeScript strict, types et règles métier partagés entre app et API.
- Architecture local-first avec synchronisation.
- Déploiement continu sur VPS via Dokploy, sauvegardes testées, monitoring.
- Documentation : README illustré, diagramme d'architecture, ADR, doc d'API publique.

## 2. Périmètre

La v1 publiée sur les stores couvre le suivi quotidien, les aliments (recherche, scan, création), les recettes, le poids avec objectif adaptatif, la synchro et les rappels.

**Inclus en v1**

- Compte (email, Apple, Google), onboarding avec calcul de la cible initiale.
- Journal du jour par repas (petit-déj, déjeuner, collation, dîner), eau, reste à manger.
- Base d'aliments : CIQUAL (produits bruts), Open Food Facts (scan code-barres), aliments perso avec portions nommées, favoris, récents.
- Ajout rapide « kcal seulement », copier un repas d'hier, modèles de repas.
- Recettes avec nombre de parts et poids total cuit.
- Pesées, tendance 7 jours, objectif adaptatif hebdomadaire, cibles jour d'entraînement.
- Journal semaine/mois et bilan hebdomadaire.
- Mensurations ; photos d'évolution stockées **uniquement sur l'appareil**.
- Import du poids depuis Apple Santé / Health Connect.
- Rappels locaux (repas, pesée, bilan du dimanche).
- Widget écran d'accueil iOS (reste à manger + protéines).
- Réglages, export CSV, suppression du compte.
- Interface en français, textes centralisés pour ajouter l'anglais ensuite.

**Hors périmètre v1**

- Système d'amis, partage social, coaching.
- Abonnement payant (prévoir l'emplacement, ne pas implémenter).
- Micronutriments détaillés (seulement fibres et sel stockés, non affichés en v1).
- Reconnaissance de plat par photo / IA.
- Version web.
- Synchronisation des photos d'évolution dans le cloud.
- Intégration directe avec l'app Surcharge (prévoir seulement l'import des séances via Apple Santé plus tard).

## 3. Stack technique et architecture

Un monorepo TypeScript contient l'app Expo, l'API Hono et un paquet partagé (schémas Zod + règles de calcul). Le téléphone est la source de vérité au quotidien (SQLite local) ; l'API sert la base d'aliments, l'authentification et la synchronisation.

&#91;embedded content: architecture · app, VPS et services externes\]

L'app lit et écrit toujours dans SQLite ; le moteur de synchro échange avec l'API via HTTPS. L'API interroge Open Food Facts pour les scans, et GitHub Actions déploie les images sur Dokploy sans build sur le serveur.

**Structure du repo**

```
cran/
  apps/
    mobile/        Expo (React Native), Expo Router
    api/           Hono sur Node 22
  packages/
    shared/        schémas Zod, types, calculs nutrition/objectifs, formatage fr
    config/        tsconfig, ESLint, Prettier partagés
  docs/
    adr/           décisions d'architecture
    STATUS.md      avancement des sprints
    runbook.md     déploiement, sauvegarde, restauration
  .github/workflows/
```

Outils : pnpm workspaces + Turborepo, TypeScript `strict`, Node 22 LTS.

**App mobile (`apps/mobile`)**

| Besoin | Choix |
| --- | --- |
| Framework | Expo SDK (dernière stable), Expo Router, New Architecture |
| Base locale | `expo-sqlite` + Drizzle ORM (migrations embarquées) |
| Appels serveur | TanStack Query + client typé généré depuis l'OpenAPI de l'API |
| État UI | Zustand, minimal (feuilles ouvertes, sélection) |
| Formulaires | React Hook Form + résolveur Zod (schémas de `shared`) |
| Scan code-barres | `expo-camera` (`CameraView`, EAN-13 / EAN-8 / UPC) |
| Graphiques | `react-native-svg` (barres, anneaux, courbe) |
| Auth | client Better Auth + plugin Expo, jetons dans `expo-secure-store` |
| Rappels | `expo-notifications` (notifications locales planifiées, sans serveur) |
| Santé | `@kingstinct/react-native-healthkit` (iOS), `react-native-health-connect` (Android) |
| Widget iOS | extension SwiftUI via `@bacons/apple-targets`, données partagées par App Group |
| Police | Plus Jakarta Sans via `@expo-google-fonts/plus-jakarta-sans` |
| Erreurs | `@sentry/react-native` |
| Textes | i18next, fichier `fr.json` (aucune chaîne en dur dans les composants) |

**API (`apps/api`)**

| Besoin | Choix |
| --- | --- |
| Framework | Hono + `@hono/node-server` |
| Validation + doc | `@hono/zod-openapi`, doc publique servie par Scalar sur `/docs` |
| Base | PostgreSQL 16, Drizzle ORM + drizzle-kit (migrations versionnées) |
| Recherche | extensions `pg_trgm` + `unaccent` |
| Auth | Better Auth (email + mot de passe, Sign in with Apple, Google) monté sur `/api/auth/*` |
| Sécurité | rate limiting par IP et par utilisateur, en-têtes sécurisés, taille de requête limitée |
| Logs | pino (JSON) |
| Erreurs | `@sentry/node` |
| Tests | Vitest + Postgres de test (service container en CI) |

**Principes d'architecture**

- **Local-first** : chaque écriture va d'abord dans SQLite, l'UI lit SQLite. La synchro tourne en arrière-plan (ouverture de l'app, retour réseau, toutes les 5 min au premier plan).
- **Identifiants générés côté client** : UUID v7 sur toutes les tables synchronisées.
- **Calculs dans `shared`** : cible initiale, tendance de poids, maintien adaptatif, macros, valeurs nutritionnelles. Même code dans l'app et dans l'API, testé une seule fois.
- **L'API ne fait pas confiance au client** : chaque requête est filtrée par `user_id` de la session dans une couche repository ; tests d'isolation obligatoires.
- **Pas de stockage serveur des photos** en v1 : elles restent dans le stockage privé de l'app.

## 4. Modèle de données

Les mêmes tables existent dans Postgres (serveur) et SQLite (appareil), sauf le catalogue global d'aliments (serveur seulement, mis en cache localement à l'usage) et les photos (appareil seulement). Les schémas Drizzle et les schémas Zod correspondants vivent dans `packages/shared`.

**Colonnes communes à toute table synchronisée** : `id` (UUID v7, généré par le client), `user_id`, `created_at`, `updated_at`, `deleted_at` (suppression logique), et côté serveur `server_seq` (bigint auto-incrémenté à chaque écriture, curseur de synchro).

| Table | Colonnes principales | Notes |
| --- | --- | --- |
| `user`, `session`, `account`, `verification` | gérées par Better Auth | serveur seulement |
| `profiles` | `sex`, `birth_year`, `height_cm`, `activity_level` (1–5), `goal_rate_kg_month` (0,5 / 1 / 1,5), `protein_g_per_kg` (défaut 2,2), `fat_g_per_kg` (défaut 1,25), `training_bonus_kcal` (défaut 150), `training_days` (masque 7 bits, lundi = bit 0), `water_goal_ml` (défaut 3000), `reminders` (JSON) | une ligne par utilisateur |
| `foods` | `source` (`ciqual` \| `off` \| `user`), `source_ref` (code CIQUAL ou EAN), `owner_id` (null = global), `name`, `brand`, `kcal_100g`, `protein_100g`, `carbs_100g`, `fat_100g`, `fiber_100g`, `salt_100g`, `default_portion_g`, `off_synced_at`, `quality_flag` (`ok` \| `incoherent` \| `incomplete`) | index trigram + unaccent sur `name` et `brand`, unique sur (`source`, `source_ref`) |
| `food_portions` | `food_id`, `label` (« 1 pot »), `grams` | portions nommées |
| `favorites` | `food_id` ou `recipe_id` |  |
| `log_entries` | `date` (date locale `YYYY-MM-DD`), `meal_type` (`breakfast` \| `lunch` \| `snack` \| `dinner`), `food_id` \| `recipe_id` \| null, `label`, `grams`, `portion_label`, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `logged_at` | les valeurs nutritionnelles sont **copiées au moment de la saisie** : modifier un aliment ne réécrit pas l'historique. Ajout rapide = `food_id` null + `label` |
| `recipes` | `name`, `category`, `servings`, `cooked_weight_g` (nullable), `notes` |  |
| `recipe_ingredients` | `recipe_id`, `food_id`, `grams`, `is_raw`, `position` |  |
| `meal_templates` | `name`, `meal_type` |  |
| `meal_template_items` | `template_id`, `food_id` \| `recipe_id`, `grams`, `position` |  |
| `weigh_ins` | `date`, `measured_at`, `weight_kg` (numérique 5,2), `source` (`manual` \| `healthkit` \| `health_connect`), `external_id` | une pesée retenue par jour pour la tendance (la première du matin) |
| `measurements` | `date`, `arm_cm`, `chest_cm`, `waist_cm`, `thigh_cm` (tous nullable) |  |
| `water_logs` | `date`, `ml` | une ligne par ajout |
| `weekly_targets` | `week_start` (lundi), `maintenance_kcal`, `target_kcal`, `protein_g`, `carbs_g`, `fat_g`, `method` (`formula` \| `adaptive`), `status` (`on_track` \| `too_fast` \| `too_slow` \| `insufficient_data`) | historique des cibles, une ligne par semaine |
| `progress_photos` | `date`, `pose` (`front` \| `side` \| `back`), `local_uri` | **SQLite seulement, jamais synchronisée** |

Règles : poids en kg avec 2 décimales, valeurs nutritionnelles en numérique 6,2, énergie en kcal (convertir les kJ d'Open Food Facts si seule cette valeur existe : kcal = kJ / 4,184).

## 5. API REST et synchronisation

L'API est versionnée sous `/v1`, documentée en OpenAPI générée depuis les schémas Zod, et toutes les routes sauf `/health`, `/docs` et `/api/auth/*` exigent une session.

| Méthode et route | Rôle |
| --- | --- |
| `GET /health` | état de l'API et de la base (pour Uptime Kuma) |
| `/api/auth/*` | Better Auth : inscription, connexion email, Apple, Google, déconnexion |
| `GET /v1/me` · `PATCH /v1/me` | profil et réglages |
| `DELETE /v1/me` | suppression définitive du compte et de toutes ses données (exigé par Apple) |
| `GET /v1/foods/search?q=&limit=` | recherche : aliments perso de l'utilisateur d'abord, puis CIQUAL, puis cache Open Food Facts ; insensible aux accents |
| `GET /v1/foods/barcode/:ean` | produit par code-barres : cache local en base, sinon appel Open Food Facts, normalisation, enregistrement ; `404` si introuvable |
| `GET /v1/foods/:id` | fiche aliment + portions |
| `GET /v1/sync/pull?cursor=&limit=` | changements depuis le curseur, toutes tables synchronisées de l'utilisateur |
| `POST /v1/sync/push` | lot de changements du client |
| `GET /v1/export.csv` | export de toutes les données de l'utilisateur |

**Protocole de synchronisation**

1. Le client garde une file `pending_changes` locale (table, id, opération, données, `updated_at`).
2. **Push** : envoie jusqu'à 500 changements par lot. Le serveur applique chaque ligne en **last-write-wins** sur `updated_at` (horodatage client, refusé s'il est plus de 5 min dans le futur), vérifie que `user_id` correspond à la session, attribue un `server_seq`. Réponse : ids acceptés, ids rejetés avec raison.
3. **Pull** : renvoie les lignes dont `server_seq` > curseur, triées, par pages de 500, avec le nouveau curseur. Les suppressions arrivent comme lignes avec `deleted_at`.
4. Ordre d'une synchro : push puis pull. Idempotent : rejouer un lot ne crée pas de doublon.
5. Les aliments globaux utilisés dans le journal sont copiés dans la table `foods` locale pour fonctionner hors-ligne.
6. Purge serveur des lignes supprimées depuis plus de 90 jours.

**Open Food Facts**

- Endpoint : `https://world.openfoodfacts.org/api/v2/product/{ean}.json` avec `fields=` limité aux champs utiles.
- En-tête `User-Agent: Cran/<version> (contact@johanpoyet.fr)` obligatoire.
- Champs lus : `product_name_fr` puis `product_name`, `brands`, `nutriments.energy-kcal_100g` (sinon `energy-kj_100g` converti), `proteins_100g`, `carbohydrates_100g`, `fat_100g`, `fiber_100g`, `salt_100g`, `serving_quantity`.
- Produit gardé en cache 30 jours, puis rafraîchi à la prochaine demande.
- Timeout 4 s ; en cas d'erreur, `503` et l'app propose de créer l'aliment.

**CIQUAL**

- Script `pnpm --filter api seed:ciqual` qui importe la table CIQUAL de l'ANSES (licence ouverte Etalab) en `foods` avec `source = ciqual`.
- Idempotent (upsert sur `source_ref`), relançable à chaque nouvelle version de la table.

## 6. Règles métier et calculs

Toutes ces fonctions sont pures, dans `packages/shared/src/calc/`, couvertes à 100 % par des tests unitaires avec les exemples chiffrés ci-dessous.

**Valeur nutritionnelle d'une saisie** : chaque valeur = valeur pour 100 g × grammes / 100. Arrondi à l'affichage seulement, jamais au stockage.

**Maintien initial (onboarding)** : formule de Mifflin-St Jeor multipliée par un facteur d'activité.

```latex
BMR = 10 \cdot poids_{kg} + 6{,}25 \cdot taille_{cm} - 5 \cdot \hat{a}ge + s \qquad s = +5 \text{ (homme)},\ -161 \text{ (femme)}
```

Facteurs d'activité : 1,2 (sédentaire) · 1,375 (léger) · 1,55 (modéré) · 1,725 (actif) · 1,9 (très actif). Maintien arrondi à 10 kcal.

**Surplus quotidien** : 7 700 kcal par kg de masse corporelle, mois moyen de 30,4 jours, arrondi à 10 kcal.

```latex
surplus = \frac{rythme_{kg/mois} \times 7700}{30{,}4}
```

Exemples : 0,5 kg/mois → +130 kcal ; 1 kg/mois → +250 kcal ; 1,5 kg/mois → +380 kcal.

**Cible du jour** = maintien + surplus, + `training_bonus_kcal` si le jour est coché dans `training_days`. Le bonus est ajouté aux glucides.

**Macros** (calculées sur le poids de tendance) :

- Protéines = `protein_g_per_kg` × poids, arrondi au gramme.
- Lipides = `fat_g_per_kg` × poids, arrondi au gramme.
- Glucides = (cible − 4 × protéines − 9 × lipides) / 4.
- Exemple de référence : 68,4 kg, cible 2 900 kcal, 2,2 g/kg et 1,25 g/kg → 150 g protéines, 86 g lipides, 381 g glucides.

**Poids de tendance** : moyenne glissante des pesées des 7 derniers jours (une par jour, la première du matin). Au moins 3 pesées dans la fenêtre, sinon dernière pesée connue.

**Rythme réel** : pente d'une régression linéaire sur le poids de tendance des 14 derniers jours, exprimée en kg/semaine.

**Maintien adaptatif** (recalculé chaque lundi, écrit dans `weekly_targets`) :

1. Fenêtre de 21 jours. Conditions : au moins 14 jours avec une saisie complète (jour marqué complet, ou au moins 3 repas saisis) et au moins 8 pesées. Sinon : `status = insufficient_data`, on garde la cible précédente.
2. Estimation brute :

```latex
maintien_{estimé} = apport_{moyen} - \frac{(tendance_{fin} - tendance_{début}) \times 7700}{jours}
```

3. Lissage : nouveau maintien = 0,5 × ancien + 0,5 × estimation, et variation limitée à ±150 kcal par semaine.
4. Nouvelle cible = maintien + surplus, arrondie à 10 kcal.
5. Statut : `on_track` si le rythme réel est à ±0,1 kg/semaine de l'objectif (objectif hebdo = rythme mensuel × 7 / 30,4), sinon `too_fast` ou `too_slow`.

**Jour « dans la cible »** : apport à ±150 kcal de la cible du jour.

**Contrôle de cohérence d'un aliment** : écart entre `kcal` et 4 × P + 4 × G + 9 × L inférieur à max(15 kcal, 10 %). Sinon avertissement (non bloquant) et `quality_flag = incoherent`.

**Recette** : totaux = somme des ingrédients. Par part = totaux / `servings`. Si `cooked_weight_g` est renseigné, une portion pesée de g grammes vaut totaux × g / `cooked_weight_g`.

**Dates** : la date d'une saisie est la date locale de l'appareil au moment de la saisie ; la journée bascule à minuit local. Formatage français partout (`2 900 kcal`, `68,4 kg`).

## 7. App mobile : écrans, navigation et design system

L'app suit la direction « B — Clair & doux » : fond gris très clair, cartes blanches très arrondies, un bleu franc comme seul accent, une couleur fixe par macro. Les maquettes de référence sont dans le [canevas DA](https://claude.ai/artifact/R5kozVjydQSEnztrgoZaBy).

**Navigation** : barre flottante en bas avec 5 entrées (Jour · Journal · bouton + central · Poids · Profil). Le + ouvre la feuille « Ajouter un aliment » sur le repas le plus probable selon l'heure.

| Écran (route Expo Router) | Maquette | Contenu |
| --- | --- | --- |
| `(onboarding)/*` | B · Onboarding 1 à 5, Ta cible | 5 étapes : objectif et rythme, sexe et âge, taille et poids, activité, jours d'entraînement → récap de la cible |
| `(auth)/sign-in` | B · Connexion | Apple, Google, email |
| `(tabs)/index` | B · Aujourd'hui | carte « Il te reste », 3 anneaux de macros, eau, liste des repas |
| `add` (feuille) | B · Ajouter un aliment | choix du repas, recherche, scan, modèles, résultats multi-sélection, total + Ajouter |
| `food/[id]` (feuille) | B · Ajouter (fiche) | quantité en g ou portion nommée, valeurs calculées en direct, favori |
| `scan` | B · Scan code-barres | caméra, cadre de visée, feuille produit trouvé ou « Créer l'aliment » |
| `food/new` | B · Nouvel aliment | formulaire pour 100 g, contrôle de cohérence, portions nommées |
| `(tabs)/journal` | B · Journal | semaine / mois, barres vs cible, bilan, liste des jours |
| `(tabs)/weight` | B · Poids | tendance, courbe, objectif adaptatif, pesées |
| `weight/body` | B · Mensurations | 4 mesures, photos face / profil / dos, comparaison |
| `(tabs)/profile` | B · Objectifs | rythme, macros, jours d'entraînement, rappels, liens recettes et export |
| `recipes` · `recipes/[id]` | B · Recettes, Fiche recette | liste filtrable, détail avec parts et poids cuit |
| `settings/account` | à dessiner | email, déconnexion, export, suppression du compte, politique de confidentialité |

**Design tokens** (`apps/mobile/src/theme/tokens.ts`)

| Token | Valeur | Usage |
| --- | --- | --- |
| `bg` | #F3F4F8 | fond d'écran |
| `surface` | #FFFFFF | cartes, barre de navigation, feuilles |
| `text` | #14161F | texte principal, boutons sombres |
| `textMuted` | #5E6475 | texte secondaire |
| `border` | #E3E5EC | bordures de puces et champs |
| `accent` | #3554F5 | action principale, carte héro, onglet actif |
| `accentSoft` | #EEF1FF | fonds de badges et cartes secondaires |
| `protein` | #E8701A | protéines (fond doux #FFF1E6) |
| `carbs` | #1F9E86 | glucides (fond doux #E6F6F2) |
| `fat` | #9B6BE0 | lipides (fond doux #F2ECFC) |
| `water` | #3FA9F5 | eau |
| `success` | #0E6B58 | « dans le rythme », cohérent |
| `radius` | 28 héro · 22 cartes · 16 tuiles · 999 puces et boutons |  |
| `space` | échelle de 4 : 4, 8, 10, 12, 14, 16, 20, 24 | marges écran 20 |
| `font` | Plus Jakarta Sans 400 / 500 / 600 / 700 / 800 | titres 800, chiffres clés 800 |

**Règles UI**

- Composants de base dans `src/ui/` : `Card`, `HeroCard`, `MacroRing`, `ProgressBar`, `Chip`, `Segmented`, `Stepper`, `Sheet`, `ListRow`, `Toggle`, `PrimaryButton`, `TabBar`. Aucun style en dur dans les écrans.
- Zones tactiles d'au moins 44 × 44 pt, contrastes 4,5:1, `accessibilityLabel` sur chaque bouton icône, support de la taille de texte dynamique.
- Mode sombre : hors v1, mais tous les écrans passent par les tokens pour l'ajouter sans réécrire.
- Retour haptique léger à l'ajout d'un aliment et à l'atteinte de la cible protéines.
- États vides, chargement (squelettes) et erreur réseau prévus sur chaque écran.

## 8. Infra, CI/CD, sauvegardes, monitoring

Tout tourne sur le VPS OVH existant (4 vCPU, 7,6 Go de RAM, environ 4,9 Go disponibles), géré par Dokploy, avec deux environnements isolés et des limites de RAM par conteneur.

| Service Dokploy | Image | Limite RAM | Domaine |
| --- | --- | --- | --- |
| `cran-api-prod` | `ghcr.io/johanpoyet/cran-api:<tag>` | 256 Mo | `api.cran.johanpoyet.fr` |
| `cran-db-prod` | `postgres:16` (base Dokploy) | 512 Mo | interne |
| `cran-api-staging` | `ghcr.io/johanpoyet/cran-api:main` | 192 Mo | `api-staging.cran.johanpoyet.fr` |
| `cran-db-staging` | `postgres:16` (base Dokploy) | 256 Mo | interne |

HTTPS par Traefik + Let's Encrypt (fourni par Dokploy). Secrets (`DATABASE_URL`, `BETTER_AUTH_SECRET`, clés Apple/Google, DSN Sentry) uniquement dans les variables d'environnement Dokploy, jamais dans le repo ; un `.env.example` liste les noms.

**Image Docker de l'API** : build multi-étapes, `node:22-alpine`, utilisateur non root, `HEALTHCHECK` sur `/health`. Au démarrage, le conteneur applique les migrations Drizzle puis lance le serveur.

**CI/CD (GitHub Actions)**

1. Sur chaque pull request : installation pnpm (cache), lint, typecheck, tests de `shared`, tests de l'API contre un Postgres en service container, tests mobile (Jest).
2. Sur `main` : build de l'image, push sur GHCR (tags `main` et SHA), appel du webhook de déploiement Dokploy → **staging**.
3. Sur un tag `api-v*` : même image re-taguée, webhook → **prod**. Aucun build sur le VPS.
4. App mobile : EAS Build (profils `development`, `preview` → staging, `production` → prod), EAS Submit vers App Store Connect / Play Console, EAS Update (canaux `preview` et `production`) pour les correctifs JavaScript.

**Sauvegardes**

- Sauvegarde Dokploy planifiée de `cran-db-prod` chaque nuit vers un bucket S3 hors du VPS (OVH Object Storage, région France), rétention 14 jours quotidiens + 8 hebdomadaires.
- Procédure de restauration écrite dans `docs/runbook.md` et **testée avant la mise en production** (restauration dans `cran-db-staging`).

**Monitoring**

- Uptime Kuma (déjà en place) sur `/health` prod et staging, alerte Discord.
- Notifications Dokploy (déploiement échoué, conteneur redémarré) sur Discord.
- Sentry pour l'API et l'app (environnements `staging` et `production`, versions liées aux builds EAS).
- Logs JSON pino consultables dans Dokploy ; aucune donnée personnelle (poids, aliments) dans les logs.

## 9. Qualité : conventions, tests, Definition of Done

Le projet doit pouvoir être lu par un recruteur ou un client : conventions constantes, tests sur ce qui compte, documentation à jour.

**Conventions**

- TypeScript `strict`, pas de `any` (ESLint l'interdit), Prettier, imports triés.
- Nommage : fichiers en kebab-case, composants en PascalCase, code et commits en anglais, textes d'interface en français via i18n.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), une PR par story avec le modèle `.github/pull_request_template.md` (contexte, changements, captures, tests).
- Hooks Husky + lint-staged : lint et format avant commit.
- Aucune mention de Claude dans les commits ou les PR.

**Tests**

| Couche | Outil | Exigence |
| --- | --- | --- |
| `shared` (calculs, schémas) | Vitest | 100 % des fonctions de `calc/`, exemples de la section 6 en cas de test |
| API | Vitest + Postgres de test | chaque route : cas nominal, validation, non authentifié, **isolation entre deux utilisateurs** ; synchro : idempotence et last-write-wins |
| Mobile composants | Jest + React Native Testing Library | composants `ui/` et logique de feuille d'ajout |
| Mobile bout en bout | Maestro | parcours : onboarding, ajouter un aliment récent, scanner un produit, ajouter une part de recette, saisir une pesée |

Couverture visée : 80 % sur `shared` et `api`, publiée en badge dans le README.

**Definition of Done d'une story**

- [ ] Critères d'acceptation tous vérifiés.
- [ ] Lint, typecheck et tests verts en CI.
- [ ] Tests ajoutés pour la logique nouvelle.
- [ ] Conforme aux maquettes et aux tokens ; zones tactiles et labels d'accessibilité vérifiés.
- [ ] Fonctionne hors-ligne si la story touche aux données de l'utilisateur.
- [ ] Textes dans `fr.json`, aucune chaîne en dur.
- [ ] `docs/STATUS.md` mis à jour ; ADR si une décision s'écarte de la spec.
- [ ] PR relue et fusionnée ; déployée en staging pour les changements d'API.

**Definition of Done d'un sprint** : démo enregistrée (capture vidéo ou GIF dans la PR de clôture), build `preview` installé sur l'iPhone de Johan, rétro de 3 lignes dans `STATUS.md`.

## 10. Obligations stores et RGPD

Poids, mensurations et photos sont traités comme des données sensibles : hébergées en France, minimisées, exportables et supprimables à tout moment.

**App Store et Google Play**

- Suppression du compte depuis l'app (Réglages → Compte), effective immédiatement côté serveur.
- Sign in with Apple proposé dès que Google l'est.
- Politique de confidentialité et conditions d'utilisation publiées (page sur johanpoyet.fr), liées dans l'app et dans les fiches stores.
- Textes d'autorisation iOS clairs et en français : caméra (scan), Santé (lecture du poids), notifications, photos.
- Fiche « Confidentialité » App Store et « Sécurité des données » Play : données de santé et forme, identifiants, diagnostics ; aucun suivi publicitaire.
- HealthKit : lecture seule du poids en v1 ; données Santé jamais utilisées pour de la publicité ni transmises à des tiers.
- Pas de promesse médicale dans l'app ni la fiche ; mention « ne remplace pas un avis médical » dans l'onboarding.
- Bundle ID : `fr.johanpoyet.`cran.

**RGPD**

- Base légale : exécution du service et consentement explicite pour les données de santé (case à cocher à l'onboarding, retirable dans les réglages).
- Données hébergées sur le VPS OVH en France, sauvegardes chiffrées dans un bucket OVH en France.
- Droit d'accès et de portabilité : export CSV. Droit à l'effacement : suppression du compte, puis disparition des sauvegardes sous 30 jours (rotation).
- Sentry configuré sans données personnelles (`sendDefaultPii: false`, pas de contenu de saisie).
- Pas d'outil d'analyse tiers en v1 ; si besoin plus tard, Umami auto-hébergé sur le même VPS, sans cookie.

## 11. Plan de sprints

Dix sprints d'une semaine mènent à la soumission sur l'App Store ; dès le sprint 3, Johan utilise l'app chaque jour pour sa propre prise de masse. Chaque sprint finit par un build `preview` installé et une démo.

| Sprint | Objectif | Résultat démontrable |
| --- | --- | --- |
| S0 | Fondations | monorepo, CI verte, API « hello » déployée en staging, app vide avec tokens et TabBar |
| S1 | Compte, profil, onboarding | créer un compte, faire l'onboarding, voir sa cible initiale |
| S2 | Base d'aliments | chercher « riz » et obtenir des résultats CIQUAL, créer un aliment perso |
| S3 | Journal du jour | saisir une journée complète hors-ligne, voir le reste à manger |
| S4 | Synchronisation | mêmes données sur deux appareils, saisie hors-ligne synchronisée au retour |
| S5 | Scan code-barres | scanner un produit et l'ajouter ; produit inconnu → création |
| S6 | Recettes et modèles | créer le meal prep de la semaine, ajouter une part pesée |
| S7 | Poids et objectif adaptatif | pesées (dont Apple Santé), tendance, cible recalculée le lundi, journal semaine |
| S8 | Rappels, widget, réglages | widget « reste à manger », rappels, export, suppression de compte |
| S9 | Durcissement et publication | E2E, prod, sauvegarde restaurée, TestFlight, soumission App Store |

### S0 — Fondations

- **S0-1 Monorepo** : pnpm + Turborepo, `apps/mobile`, `apps/api`, `packages/shared`, `packages/config`, `CLAUDE.md`, `docs/STATUS.md`, `docs/adr/0001-stack.md`.
  - Accepté si `pnpm lint`, `pnpm typecheck`, `pnpm test` passent à la racine.
- **S0-2 CI** : workflow PR (lint, typecheck, tests avec Postgres service).
  - Accepté si une PR avec une erreur de type est bloquée.
- **S0-3 API squelette** : Hono, `/health`, `/docs` (Scalar), Drizzle branché, Dockerfile, pino, Sentry.
  - Accepté si `GET /health` renvoie l'état de la base en staging.
- **S0-4 Déploiement staging** : image sur GHCR, webhook Dokploy, domaine `api-staging`, limites de RAM. *Demander l'accord de Johan avant toute action sur le VPS* ; fournir la checklist Dokploy à exécuter.
  - Accepté si un merge sur `main` redéploie le staging sans action manuelle.
- **S0-5 App squelette** : Expo Router, tokens, police, composants `ui/` de base, TabBar flottante avec 5 écrans vides, i18n, Sentry, profils EAS.
  - Accepté si un build `preview` s'installe sur iPhone et affiche la TabBar conforme à la maquette.

### S1 — Compte, profil, onboarding

- **S1-1 Calculs initiaux dans `shared`** : Mifflin-St Jeor, surplus, macros, avec les exemples de la section 6 en tests.
  - Accepté si 68,4 kg / 2 900 kcal donne 150 g P, 86 g L, 381 g G.
- **S1-2 Auth API** : Better Auth (email, Apple, Google), tables, rate limiting sur les routes d'auth.
  - Accepté si les tests couvrent inscription, connexion, session expirée.
- **S1-3 Auth app** : écran de connexion, jetons en SecureStore, déconnexion, garde de navigation.
  - Accepté si l'app relancée reste connectée et qu'une session révoquée renvoie à la connexion.
- **S1-4 Profil** : `GET/PATCH /v1/me`, table `profiles`.
  - Accepté si un utilisateur ne peut lire ni modifier le profil d'un autre (test).
- **S1-5 Onboarding** : 5 étapes, consentement données de santé, récap de la cible, première ligne `weekly_targets` (`method = formula`).
  - Accepté si le récap affiche maintien, surplus, cible et macros cohérents avec les calculs.

### S2 — Base d'aliments

- **S2-1 Schéma `foods`, `food_portions`, `favorites`** côté serveur, extensions `pg_trgm` et `unaccent`.
- **S2-2 Import CIQUAL** : script idempotent `seed:ciqual`.
  - Accepté si une relance ne crée aucun doublon.
- **S2-3 Recherche** : `GET /v1/foods/search`, aliments perso d'abord, insensible aux accents et fautes légères.
  - Accepté si « poulet », « pate » et « flocon avoine » renvoient des résultats pertinents en moins de 200 ms sur staging.
- **S2-4 Base locale** : `expo-sqlite` + Drizzle, migrations embarquées, tables de la section 4 côté appareil.
- **S2-5 Aliment perso** : écran « Nouvel aliment », contrôle de cohérence, portions nommées, favori.
  - Accepté si 162 kcal / P 6 / G 30 / L 2 affiche « Cohérent » et 300 kcal avec les mêmes macros affiche un avertissement.

### S3 — Journal du jour

- **S3-1 Écran Aujourd'hui** : carte « Il te reste », anneaux de macros, liste des 4 repas, lecture depuis SQLite.
- **S3-2 Feuille d'ajout** : choix du repas (pré-sélectionné selon l'heure), recherche, onglets Récents / Favoris, multi-sélection, total.
  - Accepté si ajouter un aliment récent prend 3 taps ou moins.
- **S3-3 Fiche quantité** : grammes ou portion nommée, dernière quantité utilisée pré-remplie, valeurs en direct.
- **S3-4 Modifier / supprimer une saisie**, déplacer vers un autre repas.
- **S3-5 Ajout rapide kcal** et **copier un repas d'hier**.
- **S3-6 Eau** : ajout par verre de 250 ml, objectif réglable.
  - Accepté si toute la story fonctionne en mode avion.

### S4 — Synchronisation

- **S4-1 Colonnes de synchro** : `updated_at`, `deleted_at`, `server_seq` sur toutes les tables concernées, triggers ou couche repository qui incrémentent `server_seq`.
- **S4-2 Endpoints** `POST /v1/sync/push` et `GET /v1/sync/pull` selon le protocole de la section 5.
  - Accepté si les tests prouvent : idempotence, last-write-wins, refus d'une ligne d'un autre utilisateur, pagination du pull.
- **S4-3 Moteur de synchro client** : file `pending_changes`, push puis pull, déclenchement (ouverture, retour réseau, 5 min), indicateur discret d'état.
  - Accepté si une journée saisie en mode avion apparaît sur un second appareil après retour du réseau.
- **S4-4 Cache des aliments globaux** utilisés, copiés localement.
- **S4-5 ADR** `0002-sync-local-first.md` : choix last-write-wins, limites connues.

### S5 — Scan code-barres

- **S5-1 Proxy Open Food Facts** : `GET /v1/foods/barcode/:ean`, normalisation, cache 30 jours, User-Agent, timeout, conversion kJ.
  - Accepté si un second appel au même EAN ne sollicite pas Open Food Facts (test avec mock).
- **S5-2 Écran Scan** : `CameraView`, cadre, lampe, vibration à la détection, permission refusée gérée.
- **S5-3 Feuille produit** : portions proposées (`serving_quantity`, 100 g, autre), repas cible, ajout.
  - Accepté si scanner → ajouter prend 2 taps après la détection.
- **S5-4 Produit introuvable ou incohérent** : « Créer l'aliment » pré-rempli avec l'EAN ; fiche incohérente signalée et corrigeable en aliment perso.
- **S5-5 Hors-ligne** : un EAN déjà scanné est reconnu sans réseau.

### S6 — Recettes et modèles

- **S6-1 Recettes** : liste filtrable, création et édition (ingrédients, grammes, cru, parts, poids cuit), valeurs par part.
  - Accepté si « Poulet riz curry » (800 g poulet cru, 320 g riz cru, 400 g brocolis, 200 ml lait de coco léger, 40 g pâte de curry, 4 parts) affiche environ 614 kcal par part.
- **S6-2 Ajouter une recette au journal** : 1 part, n parts ou portion pesée (si poids cuit renseigné).
- **S6-3 Modèles de repas** : enregistrer un repas du jour comme modèle, l'appliquer en 2 taps depuis la feuille d'ajout.
- **S6-4 Favoris** pour aliments et recettes.

### S7 — Poids et objectif adaptatif

- **S7-1 Pesées** : saisie manuelle, liste, modification, suppression.
- **S7-2 Apple Santé / Health Connect** : autorisation, import du poids (dédoublonnage par `external_id`), import au lancement.
- **S7-3 Calculs** : tendance 7 jours, rythme réel, maintien adaptatif avec les tests de la section 6 (dont données insuffisantes).
- **S7-4 Écran Poids** : carte tendance + courbe 14 jours, bloc objectif adaptatif, progression du mois.
- **S7-5 Recalcul du lundi** : à la première ouverture de la semaine, nouvelle ligne `weekly_targets` et message explicatif (« Cible ajustée à 2 950 kcal : tu prends un peu moins vite que prévu »).
  - Accepté si la cible ne bouge jamais de plus de 150 kcal d'une semaine à l'autre.
- **S7-6 Journal** : vue semaine (barres vs cible, bilan) et vue mois.
- **S7-7 Mensurations et photos locales** : mesures synchronisées, photos dans le stockage privé de l'app, comparaison côte à côte.

### S8 — Rappels, widget, réglages

- **S8-1 Rappels locaux** : repas (si rien saisi à 14 h), pesée (8 h), bilan du dimanche (19 h), réglables.
- **S8-2 Widget iOS** : reste à manger + protéines du jour, mis à jour à chaque saisie via App Group, ouvre l'app sur la feuille d'ajout.
- **S8-3 Écran Objectifs** : rythme, macros par kg, jours d'entraînement et bonus.
- **S8-4 Export CSV** et **suppression du compte** (confirmation en deux étapes, suppression serveur + base locale).
- **S8-5 Pages légales** : politique de confidentialité et conditions, liens dans l'app.

### S9 — Durcissement et publication

- **S9-1 Tests Maestro** des 5 parcours de la section 9, exécutés avant chaque release.
- **S9-2 Revue** : accessibilité (VoiceOver sur les écrans principaux), performances (liste de 500 saisies fluide), états vides et erreurs.
- **S9-3 Production** : services prod dans Dokploy, sauvegarde nocturne, **restauration testée** dans staging, monitoring. *Accord de Johan avant chaque action sur le VPS.*
- **S9-4 Fiches stores** : icône, 6 captures par taille d'écran, description, mots-clés, confidentialité.
- **S9-5 TestFlight** avec 5 à 10 testeurs pendant une semaine, corrections.
- **S9-6 Soumission App Store** ; Google Play dans la foulée si le build Android est validé.

## 12. Livrables portfolio et décisions à prendre

Le projet se présente comme une étude de cas complète : du besoin personnel à l'app publiée, avec les preuves techniques visibles.

**Livrables portfolio**

- [ ] README : pitch, GIF de la saisie et du scan, captures, liens stores, badges CI et couverture, démarrage local en 3 commandes.
- [ ] `docs/architecture.md` avec le diagramme de la section 3 et le protocole de synchro.
- [ ] ADR (au moins : stack, local-first, auth, hébergement mono-VPS).
- [ ] Doc d'API publique sur `/docs`.
- [ ] Page étude de cas sur johanpoyet.fr : problème, maquettes (directions A/B/C et choix), architecture, défis (synchro, objectif adaptatif), résultats.
- [ ] Mini page d'accueil de l'app (lien stores + politique de confidentialité).
- [ ] `CHANGELOG.md` généré depuis les commits.

**Décisions à prendre**

- Logo retenu : pomme croquée en marches, blanche sur bleu #3554F5, feuille orange (planche « Cran · logo retenu » du canevas DA). Exporter l'icône iOS et Android en S0-5.
- Disponibilité du nom : réserver « Cran » dans App Store Connect au S0, avec un sous-titre descriptif (par exemple « Cran — Prise de masse ») ; vérifier la marque sur la base INPI.
- Domaine de l'API : sous-domaine de johanpoyet.fr (prévu) ou domaine dédié à l'app.
- Android au lancement ou après la v1 iOS.
- Modèle économique futur (gratuit, premium) : hors v1, mais à trancher avant d'ouvrir à un large public.
