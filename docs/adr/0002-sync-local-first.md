# ADR 0002 — Synchronisation local-first, dernière écriture gagnante

- Statut : accepté
- Date : 2026-11-03

## Contexte

Cran doit marcher sans réseau : une journée se saisit en mode avion, puis se retrouve sur un autre appareil (critère du sprint 4). Toutes les écritures vont d'abord dans SQLite sur le téléphone ; le serveur Postgres est la copie de référence partagée entre les appareils d'un même utilisateur.

Un utilisateur n'a en pratique qu'un ou deux appareils, et c'est lui seul qui modifie ses données. Les conflits sont rares (le même repas modifié sur deux téléphones hors ligne) et peu graves (une quantité, un libellé).

Options étudiées :

1. **Dernière écriture gagnante par ligne** (last-write-wins sur `updated_at`), le choix de la spec.
2. **Fusion champ par champ** : horodatage par colonne, pour garder deux modifications de champs différents.
3. **CRDT** (Automerge, Yjs) ou moteur de synchro tout fait (PowerSync, ElectricSQL, WatermelonDB).

## Décision

Option 1. Les options 2 et 3 apportent une résolution plus fine pour des conflits qui n'arrivent presque jamais ici, au prix d'un modèle de données plus lourd (horodatages par colonne, documents CRDT au lieu de tables SQL) ou d'un service de plus à héberger sur le VPS.

### Protocole

- **Lignes complètes** : chaque changement est une ligne entière, dans la forme de la base du téléphone, validée par un schéma Zod strict par table (`syncRowSchemas` dans `shared`, communs à l'app et à l'API). Une suppression est une ligne avec `deletedAt` : rien n'est effacé physiquement, pour que la suppression se propage.
- **Identifiants créés par le client** (UUID v7) : une ligne garde le même identifiant sur tous les appareils, donc rejouer un envoi ne crée pas de doublon.
- **Push** (`POST /v1/sync/push`, 500 changements au plus) : chaque ligne est validée et appliquée seule, les parents avant les enfants (`SYNC_TABLES`). Le serveur garde la ligne dont le `updatedAt` est le plus récent. Une version plus ancienne est refusée (`stale`), la même version renvoyée est acceptée sans rien changer (idempotence). Les autres raisons de refus sont `unknown_table`, `read_only`, `invalid`, `forbidden`, `future_timestamp` (plus de 5 minutes d'avance), `unknown_reference` et `conflict`.
- **Pull** (`GET /v1/sync/pull`) : les lignes de l'utilisateur dont `server_seq` dépasse le curseur, toutes tables confondues, par pages de 500. `server_seq` vient d'une seule séquence Postgres pour toutes les tables ; un trigger `BEFORE UPDATE` en reprend une valeur à chaque modification, sans que le code ou le client puisse l'oublier ou la fixer.
- **Ordre** : push puis pull. Le pull ramène aussi les lignes que le téléphone vient d'envoyer, sans effet puisqu'elles sont identiques.

### Écarts à la spec

- **File par référence** : la spec prévoyait une file `pending_changes` avec l'opération et les données. La file ne garde que la table, l'identifiant de la ligne et une version ; l'envoi relit la ligne à jour. On n'envoie ainsi jamais une version intermédiaire, et une ligne modifiée pendant l'envoi reste dans la file (sa version a avancé).
- **File remplie par des triggers SQLite** sur les 12 tables envoyées, plutôt que par chaque écran : aucun chemin de code ne peut l'oublier. Une ligne reçue par le pull est écrite sans repasser par la file (drapeau `applying_pull` dans `local_meta`).
- **Cibles hebdomadaires en lecture seule** : `weekly_targets` est calculée et écrite par le serveur ; le téléphone la reçoit par le pull mais ne peut pas l'envoyer (`read_only`).
- **Déclenchement** : à l'ouverture, au retour au premier plan, au retour du réseau et toutes les 5 minutes, comme prévu, plus 3 secondes après une modification sur le téléphone, pour qu'un second appareil voie vite une saisie.
- **Catalogue global hors synchro** : les aliments CIQUAL et Open Food Facts ne passent ni par le push ni par le pull. Après chaque synchro, l'app copie par `GET /v1/foods/:id` ceux qu'utilisent ses saisies, favoris, recettes et modèles de repas (100 au plus par synchro).

### Refus côté téléphone

- `stale` : la ligne sort de la file ; le pull qui suit ramène la version du serveur.
- `unknown_reference` et `future_timestamp` : nouvel essai, 5 fois au plus (le parent peut arriver dans un lot suivant, l'horloge peut être corrigée).
- Autres raisons : la ligne sort de la file et le refus est signalé à Sentry.

## Limites connues

- **Granularité de la ligne** : deux modifications hors ligne de champs différents de la même ligne ne se fusionnent pas ; la plus récente écrase l'autre en entier.
- **Horloge des appareils** : `updatedAt` vient de l'horloge du téléphone. Un appareil en retard de quelques minutes perd ses modifications face à un appareil à l'heure. Une avance de plus de 5 minutes est refusée, mais une avance plus petite donne la victoire à cet appareil.
- **Suppression puis modification** : une suppression est une modification comme une autre. Si un appareil supprime une saisie et qu'un autre, hors ligne, la modifie plus tard, la saisie réapparaît. C'est l'inverse si la suppression est la plus récente.
- **Même horodatage** : deux versions différentes avec le même `updatedAt` à la milliseconde près sont prises pour la même ; le serveur garde la première arrivée. C'est très improbable avec des horodatages en millisecondes.
- **Doublons de favoris** : deux appareils hors ligne peuvent mettre le même aliment en favori avec deux identifiants. Les deux lignes sont gardées et l'app ignore le doublon.
- **Écritures concurrentes et curseur** : une valeur de `server_seq` est prise à l'écriture mais visible au commit. Si une transaction prend la valeur 10 et valide après une autre qui a pris 11, un pull fait entre les deux avance le curseur à 11 et ne verra jamais la ligne 10. Il faut deux écritures du même utilisateur au même instant (deux appareils qui envoient en même temps), et chaque ligne du push est sa propre transaction très courte, donc le risque est faible. La parade, si le cas se présente : ne renvoyer au pull que les lignes plus anciennes que la plus ancienne transaction encore ouverte (`pg_snapshot_xmin`), ou relire une petite marge sous le curseur.
- **Changements perdus** : un changement refusé définitivement (après 5 essais ou pour une raison non retentée) reste sur le téléphone mais n'atteint pas le serveur ; il n'est visible que dans Sentry. Se déconnecter avec des changements non envoyés les perd, après une alerte.
- **Pas de purge** : la spec prévoit d'effacer côté serveur les lignes supprimées depuis plus de 90 jours. Ce n'est pas encore fait. Il faudra aussi qu'un appareil resté hors ligne plus longtemps que ce délai reparte d'un curseur à zéro, sinon il garderait des lignes supprimées ailleurs.
- **Reconnexion** : la déconnexion efface la base locale et le curseur ; la reconnexion refait un pull complet. C'est simple et sûr tant que les données d'un utilisateur tiennent en quelques milliers de lignes.

## Conséquences

- Toute nouvelle table synchronisée doit avoir les colonnes de synchro (`syncColumns()`), son trigger `server_seq` côté Postgres (un test le vérifie), son trigger `pending_changes` côté SQLite, son schéma dans `syncRowSchemas` et sa place dans `SYNC_TABLES` après ses parents.
- Toute écriture sur le téléphone doit avancer `updatedAt`, sans quoi le serveur la refuse comme `stale` ou la prend pour une version déjà reçue.
- Les photos d'évolution (S7-7) ne passent pas par ce protocole : elles restent sur l'appareil.
- Le recalcul du lundi (S7-5) écrit une ligne `weekly_targets`, que le téléphone ne peut pas envoyer : il devra passer par le serveur (une route dédiée ou un calcul au pull), ou cette table devra devenir modifiable par le client.
