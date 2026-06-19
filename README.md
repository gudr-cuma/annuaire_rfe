# Annuaire RFE — Fusion Dossiers / Facturation

## Présentation

Application web qui remplace le prototype `fusion_dossiers_facturation.html` : elle fusionne deux exports CSV (Dossiers et Facturation électronique) par SIREN et affiche le résultat dans un tableau public, consultable, filtrable, triable et regroupable. La mise à jour des données se fait via une page d'import protégée par un secret, réservée à l'administrateur. Le reste du site est 100% public, sans compte ni connexion.

## Stack technique et pourquoi

- **React 19 + Vite** — cohérent avec le projet de référence [Financiel Vision](../Financiel%20vision/financiel-vision), léger, build rapide.
- **Tailwind CSS 4** — charte graphique partagée (couleurs, typographie) avec Financiel Vision (`src/index.css`).
- **Zustand** — state management simple côté client pour les filtres/tri/regroupement. Le volume actuel (~8 600 dossiers) est traité intégralement en mémoire navigateur après un seul appel API (`GET /api/dossiers`) — pas de pagination ni de filtres SQL côté serveur. À revoir si le volume dépassait significativement ~50 000-100 000 lignes.
- **Cloudflare Pages + Functions** — hébergement serverless, déploiement Git automatique.
- **Cloudflare D1** — base SQLite serverless. Deux tables brutes (`dossiers`, `facturation`), vidées et rechargées intégralement à chaque import (les fichiers source sont des exports complets, pas des deltas). La jointure gauche par SIREN se fait en lecture, au moment du `GET /api/dossiers` (voir `migrations/0001_initial.sql` pour la requête), avec dédoublonnage facturation par "première occurrence" (`MIN(id)`), équivalent à la logique du prototype.

## Configuration du secret d'import

Il n'y a **pas de système multi-utilisateurs** : un seul secret partagé (`IMPORT_SECRET`), à garder confidentiel, protège uniquement la page `/import` et les endpoints `POST /api/import/auth` et `POST /api/import/upload`. La page de consultation et `GET /api/dossiers`/`GET /api/meta` restent publics sans aucune vérification.

- Le secret est vérifié côté serveur (comparaison à temps constant), puis un cookie de session signé en HMAC-SHA256 (`HttpOnly; Secure; SameSite=Strict`) est posé pour une durée de **2 heures** (configurable via `IMPORT_SESSION_DURATION_HOURS` dans `wrangler.toml`, sans changement de code).
- **En local** : créer un fichier `.dev.vars` à la racine (jamais commité, dans `.gitignore`) avec `IMPORT_SECRET=votre-secret-de-dev`.
- **En production** : `wrangler secret put IMPORT_SECRET` (saisie interactive), ou via Dashboard Cloudflare → Pages → annuaire-rfe → Settings → Environment variables → type **Secret**.
- En cas de doute sur une fuite, changez simplement la valeur du secret (pas de révocation de comptes à gérer).

## Lancer en local

```bash
npm install

# 1. Créer .dev.vars (jamais commité) :
echo "IMPORT_SECRET=votre-secret-de-dev" > .dev.vars

# 2. Initialiser la base D1 locale (une fois) :
npm run d1:migrate:local

# 3a. UI seule (sans les Functions/API, pour du dev rapide sur les composants) :
npm run dev

# 3b. Build + Functions + D1 local ensemble (pour tester l'API et l'import) :
npm run build
npx wrangler pages dev ./dist
```

Le serveur `wrangler pages dev` écoute par défaut sur `http://127.0.0.1:8788`.

> **Test du flux d'import dans un navigateur en local** : le cookie de session porte l'attribut `Secure`, qui n'est honoré par les navigateurs que sur HTTPS. Sur `http://127.0.0.1:8788` (HTTP), le cookie ne sera donc pas posé par le navigateur après la saisie du secret. Pour tester le flux complet (saisie du secret → upload) dans un navigateur en local, lancez plutôt :
> ```bash
> npx wrangler pages dev ./dist --local-protocol https
> ```
> (certificat auto-signé, à accepter dans le navigateur). En production sur Cloudflare Pages, le site est servi en HTTPS donc ce point ne se pose pas. Les endpoints peuvent aussi être testés directement via `curl` sans ce problème (le cookie est transmis explicitement).

## Déployer

1. Pousser le repo sur la branche connectée à Cloudflare Pages (déploiement automatique à chaque push).
2. Dashboard Cloudflare → Workers & Pages → Create → Pages → Connect to Git → sélectionner le repo. Build command : `npm run build`. Output directory : `dist`.
3. Lier le binding D1 dans Dashboard → Settings → Functions → D1 database bindings → ajouter `DB` → `annuaire-rfe-db` (en plus de la déclaration dans `wrangler.toml`, nécessaire pour les déploiements Git-connectés).
4. Configurer `IMPORT_SECRET` en variable d'environnement secrète de production (Dashboard → Settings → Environment variables).
5. Premier import des CSV de production via `/import`.

## Mettre à jour les données

1. Se rendre sur `/import`.
2. Saisir le secret d'import.
3. Déposer les deux fichiers CSV :
   - **Dossiers** : séparateur `;`, colonnes `SIREN;NOM;CPOSTAL;VIL;UN_GESDOSNO;DOSSIER;FEDERATION;AGC`.
   - **Facturation** : séparateur `,`, colonnes `SIREN,Présent dans l'annuaire de la facturation électronique,Plateforme agréée rattachée,Adresse de facturation,Adresse de facturation active`.
4. Cliquer sur **Importer**. Cela remplace intégralement les données existantes (pas de fusion incrémentale) et horodate l'import. La date du dernier import et les compteurs de lignes sont affichés publiquement sur la page d'accueil après l'import.

## Limites connues

- Volumétrie actuelle ~8 600 dossiers / ~9 500 lignes de facturation, traitée intégralement côté client après un seul chargement — stratégie à revoir si le volume devenait significativement plus important.
- Pas de système multi-utilisateurs, pas d'historique des imports : seul le dernier import est conservé et affiché.
- En cas d'erreur en cours de réimport (réseau coupé pendant l'upload, par exemple), les tables peuvent rester partiellement vidées : il suffit de relancer un import complet pour les rétablir intégralement (les fichiers source sont des exports complets, pas des deltas).

## Référence

Le prototype original (`fusion_dossiers_facturation.html`) et les CSV d'exemple sont conservés à la racine du repo comme référence de non-régression de la logique métier (fusion, calcul du département, normalisation des filtres).
