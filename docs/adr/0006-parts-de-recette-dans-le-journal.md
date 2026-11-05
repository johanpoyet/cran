# ADR 0006 — Parts de recette gardées dans le journal

- Statut : accepté (décision de Johan, 2026-11-05)
- Date : 2026-11-05

## Contexte

S6-2 ajoute une recette au journal : 1 part, n parts ou une portion pesée (si le poids cuit est renseigné). La spec (section 4) donne à `log_entries` une quantité `grams` et un libellé `portion_label`, sans nombre de parts.

Une recette sans poids cuit n'a pas de poids de part : une saisie « 2 parts » n'aurait ni grammes ni moyen d'être modifiée. Pour une recette avec poids cuit, modifier la saisie en grammes ferait perdre l'unité choisie (« 2 parts »).

Options étudiées :

1. Ajouter une colonne `servings` à `log_entries` : la saisie garde son nombre de parts et se modifie en parts.
2. Rien ajouter : la saisie affiche « 2 parts » sans grammes et seul le repas reste modifiable, comme un ajout rapide.

## Décision

Option 1, choisie par Johan.

- `log_entries.servings` (nullable, > 0) : parts d'une recette saisie en parts. Null pour une portion pesée, un aliment ou un ajout rapide. Migrations `0006_log_entry_servings` (Postgres) et `0004_log_entry_servings` (SQLite).
- Saisie en parts : valeurs = n × valeurs par part ; `grams` = n × poids d'une part si le poids cuit est connu, sinon null.
- Portion pesée : `grams` = poids pesé, valeurs = totaux × g / poids cuit (spec section 6), `servings` null.
- La feuille d'une saisie modifie les parts d'une saisie en parts (les grammes suivent), et les grammes de toute autre saisie.
- Schéma de synchro : `servings` vaut null par défaut. Une ligne envoyée par une version de l'app sans ce champ reste acceptée.

## Conséquences

- Une saisie de recette garde ce que l'utilisateur a choisi, en parts ou en grammes.
- Une app plus ancienne refuse les lignes reçues qui portent `servings` (schéma strict) : la mise à jour de l'app suit celle de l'API.
- Une API plus ancienne refuse toute saisie envoyée avec `servings`, même nul : l'API doit être déployée avant que l'app mise à jour ne synchronise.
