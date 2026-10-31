# ADR 0004 — Onboarding enregistré par le serveur avant la base locale

- Statut : accepté (décision de Johan, 2026-10-31)
- Date : 2026-10-31

## Contexte

S1-5 doit enregistrer le profil, le consentement aux données de santé, la première pesée et la première ligne `weekly_targets` (`method = formula`). La spec est local-first : chaque écriture va d'abord dans SQLite puis se synchronise. Mais la base locale (S2-4) et la synchro (S4) n'existent pas encore au sprint 1.

Options étudiées :

1. Enregistrer côté serveur avec une route dédiée.
2. Avancer S2-4 (base locale) avant S1-5.
3. Stocker provisoirement sur le téléphone, puis migrer vers SQLite en S2-4.

## Décision

Option 1, choisie par Johan.

- Tables serveur `weigh_ins` et `weekly_targets`, avec les colonnes de synchro communes, en plus de `profiles`.
- Route **`POST /v1/onboarding`**, absente de la spec. Elle enregistre en une transaction le profil (avec `health_data_consent_at`), la première pesée (`source = manual`) et la première cible, calculée par le serveur avec `initialTarget` de `shared`, la même fonction que celle du récap dans l'app. Une deuxième tentative renvoie 409 et n'écrit rien.
- Colonne `user.onboarded_at`, déclarée comme champ additionnel de Better Auth. Elle voyage avec la session, que le client Expo garde en cache, donc l'app sait sans réseau si l'onboarding est fait et choisit le bon groupe d'écrans.
- Le consentement est obligatoire pour terminer l'onboarding (décision de Johan) : sans lui, Cran ne peut pas enregistrer le poids.

## Conséquences

- L'onboarding demande du réseau. C'est déjà le cas juste avant, pour créer le compte.
- Quand la synchro existera (S4), ces lignes descendront sur le téléphone par le pull, comme toutes les autres ; la route reste valable pour un nouvel appareil.
- Le retrait du consentement (réglages, S8) devra préciser le sort des pesées déjà enregistrées.
