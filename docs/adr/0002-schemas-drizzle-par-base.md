# ADR 0002 — Schémas Drizzle à côté de leur base, schémas Zod dans `shared`

- Statut : accepté
- Date : 2026-10-31

## Contexte

La spec (section 4) dit que « les schémas Drizzle et les schémas Zod correspondants vivent dans `packages/shared` ». Or les tables existent dans deux bases différentes : Postgres côté serveur (`drizzle-orm/pg-core`) et SQLite sur l'appareil (`drizzle-orm/sqlite-core`, S2-4). Un schéma Drizzle est propre à un dialecte : l'app ne peut pas utiliser une table Postgres, et l'API ne peut pas utiliser une table SQLite.

De plus, les tables serveur référencent les tables de Better Auth (`profiles.user_id` → `user.id`, suppression en cascade). Ces tables-là n'existent que sur le serveur et sont déclarées dans l'API depuis S1-2.

## Décision

- **Schémas Zod dans `packages/shared/src/schemas/`.** Ils forment le contrat partagé par l'app et l'API : forme des données, bornes, valeurs par défaut, corps et réponses des routes. L'API les utilise pour valider les requêtes et générer l'OpenAPI ; l'app les utilisera pour ses formulaires et la synchro.
- **Schémas Drizzle Postgres dans `apps/api/src/db/schema/`**, avec les migrations (`apps/api/drizzle/`).
- **Schémas Drizzle SQLite dans `apps/mobile`** (S2-4), avec les migrations embarquées dans l'app.
- Les colonnes et les valeurs par défaut des deux bases viennent des constantes de `shared` (`PROFILE_DEFAULTS`, `DEFAULT_REMINDERS`…), pour qu'elles ne divergent pas.

## Écart à la spec

Seuls les schémas Zod sont dans `shared`. Les schémas Drizzle restent chacun à côté de la base qu'ils décrivent. Mettre les deux dialectes dans `shared` obligerait ce paquet à dépendre de `drizzle-orm` et des tables de Better Auth, sans que l'app ni l'API puissent réutiliser le schéma de l'autre.

## Conséquences

- La cohérence entre Postgres, SQLite et Zod repose sur les constantes partagées et sur les tests : tests de l'API pour Postgres, tests de la synchro (S4) pour l'aller-retour entre les deux bases.
