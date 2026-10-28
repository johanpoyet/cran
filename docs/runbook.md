# Runbook

Exploitation de l'API Cran sur le VPS OVH géré par Dokploy : déploiement, vérification, retour arrière. Les sections sauvegarde et restauration seront écrites en S9-3, avant la mise en production.

## Vue d'ensemble

| Service Dokploy    | Image                                      | Limite RAM | Domaine                          |
| ------------------ | ------------------------------------------ | ---------- | -------------------------------- |
| `cran-api-staging` | `ghcr.io/johanpoyet/cran-api:main`         | 192 Mo     | `api-staging.cran.johanpoyet.fr` |
| `cran-db-staging`  | `postgres:16` (base Dokploy)               | 256 Mo     | interne                          |
| `cran-api-prod`    | `ghcr.io/johanpoyet/cran-api:<tag>` (S9-3) | 256 Mo     | `api.cran.johanpoyet.fr`         |
| `cran-db-prod`     | `postgres:16` (base Dokploy, S9-3)         | 512 Mo     | interne                          |

Aucun build n'a lieu sur le VPS : GitHub Actions construit l'image, la pousse sur GHCR, puis appelle le webhook Dokploy, qui tire l'image et redémarre le service.

## Déploiement continu du staging

Workflow [`.github/workflows/deploy-staging.yml`](../.github/workflows/deploy-staging.yml), déclenché à chaque push sur `main` qui touche l'API, `shared`, `config` ou les dépendances (et à la main via « Run workflow ») :

1. **Build and push API image** : image multi-étapes, poussée sur GHCR avec les tags `main` et `<sha complet>`. Le SHA est inscrit dans l'image (`APP_VERSION`).
2. **Deploy to staging** : `POST` sur le webhook Dokploy (secret `DOKPLOY_STAGING_WEBHOOK_URL`), puis attente jusqu'à ce que `GET /health` renvoie `version` = SHA du commit et `database.status` = `up` (4 min maximum).

Si le secret n'est pas défini, l'image est quand même poussée et le déploiement est sauté avec un avertissement.

## Mise en place du staging (S0-4)

À faire une seule fois, par Johan. Les libellés Dokploy peuvent varier selon la version : se fier à l'intention de chaque étape.

### 1. DNS

- [ ] Enregistrement `A` : `api-staging.cran.johanpoyet.fr` → IP publique du VPS (même cible que les autres domaines servis par Dokploy).
- [ ] Vérifier : `dig +short api-staging.cran.johanpoyet.fr` renvoie l'IP du VPS.

### 2. Image sur GHCR

- [ ] Fusionner la PR S0-4 : le workflow pousse la première image `ghcr.io/johanpoyet/cran-api:main` (le déploiement est sauté, le secret n'existant pas encore).
- [ ] GitHub → profil → Packages → `cran-api` → Package settings : vérifier que la visibilité est **Public** (le dépôt l'est). Sinon : « Change visibility » → Public. (Alternative : garder le paquet privé et déclarer GHCR dans Dokploy → Registry avec un jeton `read:packages`.)

### 3. Base `cran-db-staging`

- [ ] Dokploy → projet `cran` (le créer s'il n'existe pas) → environnement ou groupe « staging ».
- [ ] Create Service → Database → **PostgreSQL**, nom `cran-db-staging`, image Docker **`postgres:16`**, base `cran`, utilisateur `cran`, mot de passe généré.
- [ ] Ne pas exposer de port externe.
- [ ] Advanced → Resources : **Memory Limit 256 Mo** (`268435456` octets si le champ est en octets).
- [ ] Deploy, puis noter l'**Internal Connection URL** (`postgresql://cran:…@<hôte-interne>:5432/cran`).

### 4. Application `cran-api-staging`

- [ ] Create Service → **Application**, nom `cran-api-staging`.
- [ ] General → Provider : **Docker**, image `ghcr.io/johanpoyet/cran-api:main` (registre vide si le paquet est public).
- [ ] Environment :

  ```
  NODE_ENV=production
  DATABASE_URL=<Internal Connection URL de cran-db-staging>
  LOG_LEVEL=info
  NODE_OPTIONS=--max-old-space-size=128
  SENTRY_DSN=
  SENTRY_ENVIRONMENT=staging
  ```

  Ne pas définir `APP_VERSION` ni `PORT` : l'image les fournit (`PORT=3000`).

- [ ] Advanced → Resources : **Memory Limit 192 Mo** (`201326592` octets).
- [ ] Domains → Add Domain : hôte `api-staging.cran.johanpoyet.fr`, chemin `/`, **port du conteneur 3000**, HTTPS activé, certificat **Let's Encrypt**.
- [ ] Deploy. Dans les logs, attendre `migrations applied` puis `server listening`.
- [ ] Vérifier : `curl https://api-staging.cran.johanpoyet.fr/health` renvoie `"status":"ok"` et `"database":{"status":"up",…}`. `/docs` affiche la documentation.

### 5. Déploiement automatique

- [ ] Application `cran-api-staging` → Deployments : activer l'auto-deploy si l'option existe, copier la **Webhook URL**.
- [ ] Tester le webhook depuis ton poste : `curl -X POST -H 'Content-Type: application/json' -d '{}' '<Webhook URL>'` doit déclencher un nouveau déploiement visible dans Dokploy.
- [ ] GitHub → dépôt → Settings → Secrets and variables → Actions → **New repository secret** : `DOKPLOY_STAGING_WEBHOOK_URL` = la Webhook URL.
- [ ] GitHub → Actions → « Deploy staging » → **Run workflow** sur `main` : les deux jobs doivent être verts et le second afficher la réponse de `/health` avec le SHA du commit.

### 6. Monitoring

- [ ] Uptime Kuma : moniteur HTTP(s) sur `https://api-staging.cran.johanpoyet.fr/health`, code attendu 200, alerte Discord.
- [ ] Dokploy → Notifications : déploiement échoué et conteneur redémarré vers Discord (si pas déjà actif).

## Vérifier un déploiement

```sh
curl -s https://api-staging.cran.johanpoyet.fr/health | jq
# { "status": "ok", "version": "<sha>", "uptimeSeconds": 12, "database": { "status": "up", "latencyMs": 1 } }
```

- `version` donne le commit déployé : `git show <sha>`.
- `503` avec `"status": "degraded"` : l'API tourne mais la base ne répond pas. Regarder `cran-db-staging` dans Dokploy. Le conteneur de l'API n'est volontairement pas redémarré dans ce cas (son `HEALTHCHECK` ne teste que la vivacité).

## Revenir à une version précédente

Chaque build est conservé sur GHCR sous son SHA.

1. Dokploy → `cran-api-staging` → General : remplacer l'image par `ghcr.io/johanpoyet/cran-api:<sha>` d'un build sain.
2. Deploy, puis vérifier `version` sur `/health`.
3. Une fois le correctif fusionné, remettre l'image `…:main`.

Les migrations Drizzle ne sont pas réversibles automatiquement : un retour arrière après une migration destructive demande une restauration de base (section à venir).

## Sauvegarde et restauration

À écrire en S9-3 : sauvegarde nocturne Dokploy de `cran-db-prod` vers OVH Object Storage, rétention 14 jours + 8 semaines, restauration testée dans `cran-db-staging`.
