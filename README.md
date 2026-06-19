# Annuaire RFE — Fusion Dossiers / Facturation

## Présentation

Application web qui remplace le prototype `fusion_dossiers_facturation.html` : elle fusionne deux exports CSV (Dossiers et Facturation électronique) par SIREN et affiche le résultat dans un tableau public, consultable, filtrable, triable et regroupable. La mise à jour des données se fait via une page d'import protégée par un secret, réservée à l'administrateur. Le reste du site est 100% public, sans compte ni connexion.

## Stack technique et pourquoi

- **React 19 + Vite** — cohérent avec le projet de référence [Financiel Vision](../Financiel%20vision/financiel-vision), léger, build rapide.
- **Tailwind CSS 4** — charte graphique partagée (couleurs, typographie) avec Financiel Vision (`src/index.css`).
- **Zustand** — state management simple côté client pour les filtres/tri/regroupement. Le volume actuel (~8 600 dossiers) est traité intégralement en mémoire navigateur après un seul appel API (`GET /api/dossiers`) — pas de pagination ni de filtres SQL côté serveur. À revoir si le volume dépassait significativement ~50 000-100 000 lignes.
- **Cloudflare Pages + Functions** — hébergement serverless, déploiement Git automatique.
- **Cloudflare D1** — base SQLite serverless. Tables `dossiers` et `facturation` ("Annuaire"), vidées et rechargées intégralement à chaque import (les fichiers source sont des exports complets, pas des deltas) — **chaque fichier s'importe désormais indépendamment** (4 routes séparées : dossiers, annuaire, AGC, fédération), une table n'est jamais touchée par l'import d'une autre. Deux référentiels statiques `agc_ref`/`federation_ref` (code → nom long) sont mémorisés en base via `migrations/0002_refdata_exclusions_meta.sql` (seedés depuis `AGC001.csv`/`federation001.csv`) et changent rarement. La jointure se fait en lecture, au moment du `GET /api/dossiers` (voir `functions/api/dossiers/index.js`) : dédoublonnage facturation par "première occurrence" (`MIN(id)`), résolution AGC/Fédération par code exact (un code renseigné sans correspondance est masqué, la ligne reste affichée), et filtrage des dossiers marqués comme exclus (table `excluded_dossiers`, clé stable = colonne `dossier`, survit à un ré-import du fichier Dossiers).

## Configuration du secret d'import

Il n'y a **pas de système multi-utilisateurs** : un seul secret partagé (`IMPORT_SECRET`), à garder confidentiel, protège la page `/import`, les 4 routes d'import (`POST /api/import/upload-dossiers`, `upload-annuaire`, `upload-agc`, `upload-federation`) et la gestion des exclusions (`GET/POST /api/exclusions`, `POST /api/exclusions/remove`). La page de consultation et `GET /api/dossiers`/`GET /api/meta` restent publics sans aucune vérification. Le bouton « Exclure » par ligne et le panneau « Voir les exclus » n'apparaissent dans le tableau de consultation que pour un visiteur ayant une session admin active.

- Le secret est vérifié côté serveur (comparaison à temps constant), puis un cookie de session signé en HMAC-SHA256 (`HttpOnly; Secure; SameSite=Strict`) est posé pour une durée de **2 heures** (configurable via `IMPORT_SESSION_DURATION_HOURS` dans `wrangler.toml`, sans changement de code).
- **En local** : créer un fichier `.dev.vars` à la racine (jamais commité, dans `.gitignore`) avec `IMPORT_SECRET=votre-secret-de-dev`.
- **En production** : `wrangler secret put IMPORT_SECRET` (saisie interactive), ou via Dashboard Cloudflare → Pages → annuaire-rfe → Settings → Environment variables → type **Secret**.
- En cas de doute sur une fuite, changez simplement la valeur du secret (pas de révocation de comptes à gérer).

## Lancer en local

```bash
npm install

# 1. Créer .dev.vars (jamais commité) :
echo "IMPORT_SECRET=votre-secret-de-dev" > .dev.vars

# 2. Initialiser la base D1 locale (une fois — applique 0001 puis 0002, schéma + seed AGC/Fédération) :
npm run d1:migrate:local

# 3a. UI seule (sans les Functions/API, pour du dev rapide sur les composants) :
npm run dev

# 3b. Build + Functions + D1 local ensemble (pour tester l'API et l'import) :
npm run build
npm run pages:dev
```

Le serveur `wrangler pages dev` écoute sur **`http://127.0.0.1:8766`** (port fixé explicitement dans le script `pages:dev` du `package.json` — 8788, le port par défaut de wrangler, est déjà utilisé par un autre outil sur le poste habituel de développement). Changez ce port dans `package.json` si besoin localement.

> **Test du flux d'import dans un navigateur en local** : le cookie de session porte l'attribut `Secure`, qui n'est honoré par les navigateurs que sur HTTPS. Sur `http://127.0.0.1:8766` (HTTP), le cookie ne sera donc pas posé par le navigateur après la saisie du secret. Pour tester le flux complet (saisie du secret → upload) dans un navigateur en local, lancez plutôt :
> ```bash
> npx wrangler pages dev ./dist --port 8766 --local-protocol https
> ```
> (certificat auto-signé, à accepter dans le navigateur). En production sur Cloudflare Pages, le site est servi en HTTPS donc ce point ne se pose pas. Les endpoints peuvent aussi être testés directement via `curl` sans ce problème (le cookie est transmis explicitement).

## Déployer

1. Pousser le repo sur la branche connectée à Cloudflare Pages (déploiement automatique à chaque push).
2. Dashboard Cloudflare → Workers & Pages → Create → Pages → Connect to Git → sélectionner le repo. Build command : `npm run build`. Output directory : `dist`.
3. Lier le binding D1 dans Dashboard → Settings → Functions → D1 database bindings → ajouter `DB` → `annuaire-rfe-db` (en plus de la déclaration dans `wrangler.toml`, nécessaire pour les déploiements Git-connectés).
4. Configurer `IMPORT_SECRET` en variable d'environnement secrète de production (Dashboard → Settings → Environment variables).
5. Premier import des CSV de production via `/import`.

## Mettre à jour les données

Se rendre sur `/import`, saisir le secret. Quatre fichiers indépendants, chacun avec son propre bouton **Importer** — déposer et importer un seul fichier ne touche pas les autres tables :

- **Fichier Dossiers** (rarement mis à jour) : séparateur `;`, colonnes `SIREN;NOM;CPOSTAL;VIL;UN_GESDOSNO;DOSSIER;FEDERATION;AGC`.
- **Fichier Annuaire** (mis à jour souvent — c'est l'ancien fichier « Facturation ») : séparateur `,`, colonnes `SIREN,Présent dans l'annuaire de la facturation électronique,Plateforme agréée rattachée,Adresse de facturation,Adresse de facturation active`.
- **Fichier AGC** (rarement mis à jour) : séparateur `;`, 2 colonnes sans en-tête `code;nom`.
- **Fichier Fédération** (rarement mis à jour) : même format que AGC.

Chaque import remplace intégralement la table correspondante (pas de fusion incrémentale) et horodate cet import spécifiquement. La date et le compteur de lignes de chacun des 4 jeux de données sont affichés publiquement sur la page d'accueil.

### Exclure une ligne du tableau public

En session admin (après connexion sur `/import`, valable sur tout le site pendant la durée de la session), un bouton **Exclure** apparaît sur chaque ligne du tableau de consultation. L'exclusion est persistante : elle est gardée même après un ré-import complet du fichier Dossiers (elle est indexée par la colonne `DOSSIER`, pas par un identifiant technique qui changerait à chaque import). Le panneau **Voir les exclus** (au-dessus du tableau) liste les lignes actuellement exclues et permet de les **Réinclure**.

## Limites connues

- Volumétrie actuelle ~8 600 dossiers / ~9 500 lignes de facturation, traitée intégralement côté client après un seul chargement — stratégie à revoir si le volume devenait significativement plus important.
- Pas de système multi-utilisateurs, pas d'historique des imports : seul le dernier import est conservé et affiché.
- En cas d'erreur en cours de réimport (réseau coupé pendant l'upload, par exemple), les tables peuvent rester partiellement vidées : il suffit de relancer un import complet pour les rétablir intégralement (les fichiers source sont des exports complets, pas des deltas).

## Référence

Le prototype original (`fusion_dossiers_facturation.html`) et les CSV d'exemple sont conservés à la racine du repo comme référence de non-régression de la logique métier (fusion, calcul du département, normalisation des filtres).

Les référentiels AGC et Fédération (codes → noms longs) sont seedés une fois pour toutes dans `migrations/0002_refdata_exclusions_meta.sql` à partir des fichiers fournis (`AGC001.csv`, `federation001.csv`) — pas besoin de les ré-importer via `/import` sauf changement de ces référentiels (rare).

Le brief originel (`docs/BRIEF_refonte_avec_base_de_donnees.md`) et le plan d'implémentation détaillé (`docs/PLAN_implementation.md`) sont conservés dans `docs/` pour documenter le contexte et les décisions prises pendant la conception.
