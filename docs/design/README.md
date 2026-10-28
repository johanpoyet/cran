# Maquettes Cran — direction B « Clair & doux »

Captures des maquettes de référence (iPhone, 390 × 844 pt, exportées en @2x). Elles priment sur toute autre description visuelle ; les design tokens sont dans `docs/SPEC.md`, section 7.

Les écrans avec une barre de navigation flottante défilent : le contenu passe sous la barre.

| Fichier | Écran | Route Expo Router | Sprint |
| --- | --- | --- | --- |
| `00-vue-ensemble.png` | Planche de tous les écrans | — | — |
| `01-connexion.png` | Connexion | `(auth)/sign-in` | S1 |
| `02-onboarding-1-rythme.png` | Onboarding 1 · rythme | `(onboarding)/rate` | S1 |
| `03-onboarding-2-toi.png` | Onboarding 2 · sexe, année de naissance | `(onboarding)/about` | S1 |
| `04-onboarding-3-taille-poids.png` | Onboarding 3 · taille et poids | `(onboarding)/body` | S1 |
| `05-onboarding-4-activite.png` | Onboarding 4 · activité | `(onboarding)/activity` | S1 |
| `06-onboarding-5-entrainement.png` | Onboarding 5 · jours d'entraînement | `(onboarding)/training` | S1 |
| `07-onboarding-ta-cible.png` | Récap de la cible + consentement santé | `(onboarding)/summary` | S1 |
| `10-aujourdhui.png` | Aujourd'hui | `(tabs)/index` | S3 |
| `11-ajouter-un-aliment.png` | Feuille « Ajouter un aliment » | `add` | S3 |
| `12-scan-code-barres.png` | Scan code-barres | `scan` | S5 |
| `13-nouvel-aliment.png` | Nouvel aliment | `food/new` | S2 |
| `14-mes-recettes.png` | Mes recettes | `recipes` | S6 |
| `15-fiche-recette.png` | Fiche recette | `recipes/[id]` | S6 |
| `20-journal.png` | Journal et bilan semaine | `(tabs)/journal` | S7 |
| `21-poids.png` | Poids et objectif adaptatif | `(tabs)/weight` | S7 |
| `22-mensurations-photos.png` | Mensurations et photos | `weight/body` | S7 |
| `30-objectifs-reglages.png` | Objectifs et réglages (écran long, défilant) | `(tabs)/profile` | S8 |
| `90-logo-cran.png` | Planche logo | — | S0 |

## Logo (`logo/`)

- `app-icon-1024.png` : icône App Store, 1024 × 1024, fond plein sans coins arrondis (iOS les applique). À utiliser pour `expo.icon` et comme base de l'icône adaptative Android.
- `app-icon.svg` : même icône en vectoriel.
- `cran-mark.svg` : symbole seul, pour fond clair (splash, écran de connexion, site).

Couleurs : bleu `#3554F5`, feuille `#FFB27A` sur fond bleu, `#E8701A` sur fond clair.
