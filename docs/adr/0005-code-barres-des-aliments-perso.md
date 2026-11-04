# ADR 0005 — Code-barres gardé par les aliments perso

- Statut : accepté (décision de Johan, 2026-11-04)
- Date : 2026-11-04

## Contexte

S5-4 permet de créer un aliment depuis le scan : produit introuvable sur Open Food Facts, mauvais produit, ou fiche incohérente « corrigeable en aliment perso ». Sans lien avec le code-barres, chaque nouveau scan du même produit redirait « introuvable » ou remontrerait les valeurs fausses.

La spec (section 4) prévoit `source_ref` (« code CIQUAL ou EAN ») avec un index unique sur (`source`, `source_ref`), et `source_ref` vide pour les aliments perso. Avec cet index, deux utilisateurs ne pourraient pas avoir chacun leur aliment pour un même code : le second serait refusé par la synchro.

Options étudiées :

1. Garder le code dans `source_ref` des aliments perso, avec une règle d'unicité par utilisateur.
2. Ne pas garder le code : le formulaire est seulement pré-rempli.

## Décision

Option 1, choisie par Johan.

- Un aliment perso créé depuis le scan garde le code-barres dans `source_ref`, sous sa forme EAN-13 pour un UPC-A (comme le cache Open Food Facts).
- L'index unique (`source`, `source_ref`) ne vaut plus que pour le catalogue (`source <> 'user'`). Un second index unique (`owner_id`, `source_ref`) vaut pour les aliments perso non supprimés qui ont un code. Chaque utilisateur peut avoir son aliment pour un code, une seule fois. Migrations `0005_user_food_barcode` (Postgres) et `0003_user_food_barcode` (SQLite).
- Créer un nouvel aliment pour un code déjà pris par un aliment de l'utilisateur lui retire ce code : le plus récent l'emporte, et l'ancien reste un aliment ordinaire.
- Ordre de recherche d'un code-barres :
  1. l'aliment de l'utilisateur sur le téléphone, trouvé même avant la synchro et sans réseau ;
  2. sinon `GET /v1/foods/barcode/:ean`, qui cherche l'aliment de l'utilisateur sur le serveur, puis le cache Open Food Facts, puis Open Food Facts.
- Les imports du catalogue (CIQUAL, cache Open Food Facts) visent l'index partiel dans leur `ON CONFLICT`.

## Conséquences

- Un produit corrigé une fois reste corrigé pour cet utilisateur, sur tous ses appareils, et n'est jamais montré aux autres.
- Le produit d'Open Food Facts reste dans le cache, inchangé : Cran ne corrige pas Open Food Facts.
- Deux appareils hors ligne qui créent chacun un aliment pour le même code : le second envoyé est refusé par le serveur (`conflict`). C'est rare, et la saisie faite avec cet aliment garde ses valeurs.
- Sans réseau, seul l'aliment de l'utilisateur est reconnu. Les produits Open Food Facts déjà scannés le seront avec S5-5.
