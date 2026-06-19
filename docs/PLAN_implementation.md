# Plan — Annuaire RFE (fusion Dossiers / Facturation) avec base de données

## Contexte

Un prototype HTML autonome (`fusion_dossiers_facturation.html`, 546 lignes, vanilla JS, sans backend) fusionne deux exports CSV (Dossiers ~8 600 lignes, Facturation ~9 500 lignes) par SIREN et les affiche dans un tableau triable/filtrable/regroupable, avec persistance en `localStorage`. Cette solution ne permet ni accès multi-utilisateurs, ni mise à jour à distance, ni vraie persistance partagée.

Objectif : remplacer ce prototype par une application web avec base de données, déployée sur Cloudflare (Pages + Functions + D1), accessible en lecture publique, avec une mise à jour des données réservée à l'utilisateur (Guillaume) via une page d'import protégée. Le repo GitHub cible existe déjà mais est vide : `https://github.com/gudr-cuma/annuaire_rfe.git`.

Décisions de cadrage validées avec l'utilisateur :
- **Stack et charte graphique** : réutiliser exactement celles du projet de référence `Financiel Vision` (`C:\_pCloud\Extensions\Financiel vision\financiel-vision`) — React 19 + Vite + Tailwind CSS 4 + Zustand, Cloudflare Pages/Functions/D1, mêmes couleurs/typographie/composants.
- **Auth import** : pas le système complet multi-utilisateurs de Financiel Vision (surdimensionné pour un seul utilisateur) — un secret unique en variable d'environnement Cloudflare, vérifié côté Function, saisi via un mini-formulaire sur la page d'import, avec cookie de session signé de courte durée. Le reste du site reste 100% public.
- **Stockage** : Cloudflare D1 (confirmé, conforme au brief).
- **Export CSV** : ajouté, sur les données filtrées affichées côté client.

Le prototype HTML et les 2 CSV réels sont déjà présents dans `C:\_pCloud\Extensions\annuaire_rfe` et serviront de référence de non-régression (à conserver, ne pas supprimer).

---

## 0. Analyse de volumétrie (tranche déjà le sujet ouvert du brief)

- `bdd_dossier.csv` : 8 609 lignes (~1.67 Mo), séparateur `;`.
- `adresses_de_facturation_002.csv` : 9 540 lignes (~0.3 Mo), séparateur `,`.
- JSON fusionné estimé : ~1.3–1.8 Mo non compressé, ~250–400 Ko gzip/brotli (activé par défaut sur Cloudflare) — payload raisonnable pour un seul appel au chargement.

**Décision : tout le filtrage/tri/regroupement reste côté client** (store Zustand), après un unique `GET /api/dossiers`. Le SQL ne sert qu'au stockage et à la jointure en lecture. Pas de pagination ni de filtres SQL côté API liste. Limite à documenter dans le README si le volume dépassait un jour ~50–100k lignes.

---

## 1. Structure du repo

```
annuaire_rfe/
├── .gitignore                          # adapté de financiel-vision (node_modules, dist, .dev.vars, .wrangler)
├── README.md
├── package.json
├── vite.config.js
├── wrangler.toml
├── index.html
├── eslint.config.js
├── migrations/
│   └── 0001_initial.sql
├── public/
│   └── _redirects                      # SPA fallback : /* /index.html 200
├── src/
│   ├── main.jsx
│   ├── App.jsx                         # routage minimal par pathname (/ vs /import), pas de react-router
│   ├── index.css                       # charte graphique copiée de financiel-vision/src/index.css
│   ├── components/
│   │   ├── layout/AppHeader.jsx        # simplifié : logo "Annuaire RFE", lien discret vers /import
│   │   ├── shared/Badge.jsx            # copié tel quel
│   │   ├── shared/ErrorBanner.jsx      # copié tel quel
│   │   ├── consultation/
│   │   │   ├── ConsultationPage.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── ColumnFilters.jsx       # texte "contient" + select Tous/Oui/Non/Non renseigné
│   │   │   ├── GroupingControls.jsx    # 3 selects + tout déplier/replier
│   │   │   ├── ResultsTable.jsx        # en-têtes triables
│   │   │   ├── GroupedTree.jsx         # arborescence repliable récursive
│   │   │   ├── StatusTag.jsx           # tag Oui/Non/—
│   │   │   ├── ExportCsvButton.jsx
│   │   │   └── ImportMetaBanner.jsx    # "dernier import le ..."
│   │   └── import/
│   │       ├── ImportPage.jsx
│   │       ├── ImportPasswordForm.jsx  # calqué sur LoginPage.jsx, un seul champ
│   │       └── ImportUploadForm.jsx    # 2 dropzones + bouton Importer + résultat
│   ├── store/
│   │   ├── useDataStore.js             # données + filtres/tri/groupe (logique du prototype)
│   │   └── useImportAuthStore.js       # authenticated/isLoading/authError, login(), logout()
│   ├── engine/                         # logique métier pure, testable isolément
│   │   ├── csv.js                      # detectDelimiter, parseCSV
│   │   ├── merge.js                    # calcul DEPARTEMENT (la fusion elle-même se fait en SQL, cf §2)
│   │   ├── normalize.js                # normalisation accent-insensible
│   │   ├── filterSort.js               # applyFilters, sortRows
│   │   ├── group.js                    # groupBy (structure pure, pas de rendu)
│   │   └── exportCsv.js
│   └── __tests__/
│       ├── csv.test.js
│       ├── merge.test.js
│       └── filterSort.test.js
└── functions/
    ├── _lib/
    │   ├── responses.js                # copié tel quel de financiel-vision
    │   ├── importSession.js            # cookie signé HMAC mono-secret (pas de table sessions)
    │   ├── csv.js                      # dupliqué depuis src/engine/csv.js (commentaire de synchro)
    │   └── merge.js                    # dupliqué depuis src/engine/merge.js
    └── api/
        ├── dossiers/index.js           # GET — jeu de données fusionné, public
        ├── meta/index.js               # GET — métadonnées du dernier import, public
        └── import/
            ├── auth.js                 # POST — vérifie le secret, pose le cookie
            ├── status.js               # GET — session import valide ou non
            └── upload.js                # POST — parse les 2 CSV, remplace les tables D1
```

Note : Cloudflare Pages Functions ne garantit pas de bundler partagé entre `src/` et `functions/` ; les deux petites fonctions pures (`csv.js`, `merge.js`) sont donc **dupliquées** plutôt qu'importées via alias de chemin fragile. Commentaire de synchro en tête de chaque copie.

---

## 2. Schéma D1

```sql
-- migrations/0001_initial.sql
CREATE TABLE IF NOT EXISTS dossiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  siren TEXT NOT NULL, nom TEXT, cpostal TEXT, departement TEXT, ville TEXT,
  un_gesdosno TEXT, dossier TEXT, federation TEXT, agc TEXT, imported_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facturation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  siren TEXT NOT NULL, annuaire TEXT, plateforme TEXT,
  adresse_facturation TEXT, adresse_active TEXT, imported_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dossiers_siren ON dossiers(siren);
CREATE INDEX IF NOT EXISTS idx_facturation_siren ON facturation(siren);

-- ligne unique de métadonnées du dernier import
CREATE TABLE IF NOT EXISTS import_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  imported_at TEXT NOT NULL,
  dossiers_count INTEGER NOT NULL,
  facturation_count INTEGER NOT NULL,
  dossiers_filename TEXT,
  facturation_filename TEXT
);
```

Pas de table users/sessions/permissions (cohérent avec la décision mono-secret).

**Jointure en lecture** (au moment du `GET /api/dossiers`), avec dédoublonnage facturation par "première occurrence" = `MIN(id)` (l'ordre d'insertion à l'import suit l'ordre du fichier source, donc équivalent à la logique `Map` du prototype) :

```sql
SELECT d.siren, d.nom, d.cpostal, d.departement, d.ville,
       d.un_gesdosno, d.dossier, d.federation, d.agc,
       f.annuaire, f.plateforme, f.adresse_facturation, f.adresse_active
FROM dossiers d
LEFT JOIN (
  SELECT f1.* FROM facturation f1
  WHERE f1.id = (SELECT MIN(f2.id) FROM facturation f2 WHERE f2.siren = f1.siren)
) f ON f.siren = d.siren
ORDER BY d.nom COLLATE NOCASE;
```

Approche retenue plutôt qu'une 3e table dénormalisée : évite de dupliquer la donnée et simplifie le "remplacement complet à chaque import" (2 tables à vider/recharger, pas 3). Avec un index sur `siren` et ce volume, la latence reste de l'ordre de quelques dizaines de ms.

Mise en place :
```
wrangler d1 create annuaire-rfe-db
wrangler d1 execute annuaire-rfe-db --file=./migrations/0001_initial.sql --local
wrangler d1 execute annuaire-rfe-db --file=./migrations/0001_initial.sql --remote
```

---

## 3. Endpoints Cloudflare Functions

- **`GET /api/dossiers`** — public, exécute la jointure ci-dessus, retourne `{ rows, count }`, `Cache-Control: public, max-age=60`.
- **`GET /api/meta`** — public, `SELECT * FROM import_meta WHERE id = 1` → `{ imported_at, dossiers_count, facturation_count, dossiers_filename, facturation_filename }` (ou `imported_at: null` si jamais importé).
- **`POST /api/import/auth`** — body `{ secret }`, compare à `env.IMPORT_SECRET` (comparaison à temps constant), pose le cookie de session si correct, sinon 401.
- **`GET /api/import/status`** — vérifie le cookie courant, retourne `{ authenticated }`.
- **`POST /api/import/upload`** — protégé par cookie (401 sinon). Multipart avec champs `dossiers` et `facturation` :
  1. lire le texte des 2 fichiers, `detectDelimiter` + `parseCSV` ;
  2. valider le nombre de colonnes attendu (8 / 5), sinon 400 explicite ;
  3. calculer `DEPARTEMENT` par ligne dossiers ;
  4. `imported_at` = horodatage unique pour tout l'import ;
  5. remplacement complet : `DELETE FROM dossiers`, `DELETE FROM facturation`, réinsertion, puis `INSERT OR REPLACE INTO import_meta` ;
  6. retourner `{ ok, dossiers_count, facturation_count, imported_at }`.

  **Point d'attention technique** : D1 limite la taille/le nombre de statements par `db.batch()`. Avec ~18 000 lignes à insérer au total, découper en lots de ~500–1000 lignes exécutés séquentiellement plutôt qu'un batch unique géant. Pas de transaction multi-batch native en D1 — risque résiduel documenté (table partiellement vidée en cas d'erreur en cours de réimport), acceptable ici car le réimport est trivial à relancer. À vérifier concrètement avec le vrai volume via `wrangler d1 execute --local` pendant l'implémentation.

- **Export CSV** : généré côté client (`src/engine/exportCsv.js`) à partir des lignes déjà filtrées/triées en mémoire, téléchargé via Blob — pas d'endpoint serveur dédié.

---

## 4. Mécanisme du secret d'import

- Variable `IMPORT_SECRET` : en local dans `.dev.vars` (gitignored), en production via `wrangler secret put IMPORT_SECRET` ou Dashboard Cloudflare Pages → Environment variables (type Secret). Jamais commité, jamais en clair dans `wrangler.toml`.
- `functions/api/import/auth.js` compare le secret reçu à `env.IMPORT_SECRET` en temps constant (pas de PBKDF2 nécessaire — c'est un secret d'environnement, pas un mot de passe utilisateur stocké).
- Cookie de session **auto-signé HMAC** (`functions/_lib/importSession.js`, modèle simplifié de `functions/_lib/session.js` de Financiel Vision) — pas de table `sessions` en D1, pas d'état serveur à nettoyer. Attributs `HttpOnly; Secure; SameSite=Strict; Path=/`, nom de cookie `rfe_import_session`.
- Durée de session : **2 heures** (compromis confort d'usage pendant un import / risque si oublié ouvert), configurable sans changement de code via `IMPORT_SESSION_DURATION_HOURS` dans `[vars]`.
- `ImportPasswordForm.jsx` (calqué sur `LoginPage.jsx`, un seul champ) → `POST /api/import/auth`. `ImportPage.jsx` appelle `GET /api/import/status` au montage pour éviter de redemander le secret si le cookie est encore valide.

---

## 5. Composants front — réutilisation directe de Financiel Vision

| Fichier annuaire_rfe | Modèle dans financiel-vision | Adaptation |
|---|---|---|
| `src/index.css` | `src/index.css` | Copier le bloc `@theme` Tailwind + couleurs `fv-*`, garder `focus-visible` et `@keyframes spin`, retirer le superflu (TipTap, panels spécifiques). |
| `ImportPasswordForm.jsx` | `LoginPage.jsx` | Un seul champ password, pas d'email, branché sur `useImportAuthStore`. Même carte blanche centrée, bouton vert `#31B700`, erreur rouge. |
| `Badge.jsx` / `ErrorBanner.jsx` | idem | Copiés tels quels. |
| `AppHeader.jsx` | `AppHeader.jsx` | Très simplifié : pas de logout multi-utilisateur, juste logo + lien vers `/import`. |
| `useImportAuthStore.js` | `useAuthStore.js` | Réduit à `{ authenticated, isLoading, authError, init(), login(secret), logout() }`. |
| `functions/_lib/importSession.js` | `functions/_lib/session.js` | Cookie auto-signé sans état D1 au lieu de session référencée en base. |
| `functions/_lib/responses.js` | idem | Copié tel quel. |
| Dropzone d'upload | `Dropzone.jsx` | Réutilisé deux fois dans `ImportUploadForm.jsx`. |
| Style cartes/panels | Convention `#FFFFFF` / bordure `#E2E8F0` / radius 12px déjà utilisée partout | Réappliquée aux panels de filtres/contrôles du prototype. |

Routage : pas de `react-router` pour 2 pages — sélection de vue sur `window.location.pathname` dans `App.jsx`. `public/_redirects` avec `/* /index.html 200` indispensable pour que `/import` ne renvoie pas un 404 Cloudflare Pages au refresh.

---

## 6. Portage de la logique métier (prototype → nouvelle architecture)

| Logique prototype | Nouvelle home |
|---|---|
| `detectDelimiter`, `parseCSV` | `src/engine/csv.js` (client, non utilisé en prod mais testé) et `functions/_lib/csv.js` (serveur, à l'import réel) — portage exact. |
| `buildMerged()` | La fusion se fait désormais en SQL à la lecture (§2). Seul le calcul `DEPARTEMENT` (`/^\d{2}/.test(cp) ? cp.slice(0,2) : 'N/D'`) est repris en JS dans `functions/_lib/merge.js`, exécuté à l'import. |
| `normalize(s)` | `src/engine/normalize.js`, portage exact (`normalize('NFD')` + suppression diacritiques + lowercase). |
| `applyFilters`, `sortRows` | `src/engine/filterSort.js`, portage exact (recherche globale, filtres "contient"/`__EMPTY__`, `localeCompare('fr', {numeric:true, sensitivity:'base'})`). |
| `groupBy` + rendu récursif | `src/engine/group.js` (calcul pur) + `GroupedTree.jsx` (rendu React récursif), avec un état `expandedGroups: Set<string>` dans le store plutôt que manipulation DOM directe — nécessaire pour les boutons globaux déplier/replier. |
| Tags Oui/Non/— | `StatusTag.jsx`, portage direct de la logique de tagging. |
| État global du prototype | `useDataStore.js` (Zustand) : `rawRows`, `search`, `colFilters`, `group[3]`, `sortKey`, `sortDir`, `expandedGroups`, sélecteurs dérivés `filteredRows`/`groupedTree`, actions `setSearch/setColFilter/setGroupLevel/setSort/toggleGroup/expandAll/collapseAll/resetFilters/loadData()`. |
| Export CSV (nouveau) | `src/engine/exportCsv.js` : lignes filtrées + triées (regroupement ignoré, export = liste plate), séparateur `;` + BOM UTF-8 (compatibilité Excel FR). |

Point de vigilance à vérifier en test : la règle "première occurrence" passe d'une `Map` JS en mémoire (prototype) à un `MIN(id)` SQL (nouvelle architecture) — équivalents si l'ordre d'insertion respecte l'ordre du fichier source, à confirmer en §7.

---

## 7. Vérification / non-régression

- **Tests unitaires (Vitest)** sur `engine/csv.js`, `engine/merge.js`, `engine/filterSort.js` : détection délimiteur, parsing (guillemets, BOM, trim), dédoublonnage facturation par première occurrence, `CPOSTAL` invalide/vide → `"N/D"`, SIREN dupliqué côté dossiers conservé intégralement, recherche accent-insensible, tri numérique correct sur codes postaux.
- **Non-régression bout-en-bout** : ouvrir le prototype existant avec les 2 vrais CSV, noter le total de lignes et un échantillon (5 premières lignes triées par NOM + les cas limites SIREN `000000000`/`CPXXXXX`). Importer les mêmes fichiers via la nouvelle page Import, comparer total et échantillon. Vérifier que les 8 609 lignes (moins en-tête) du fichier dossiers se retrouvent intégralement.
- **Test direct de la requête de jointure SQL** via `wrangler d1 execute --local` après import de test, sur quelques SIREN en doublon côté facturation.
- **Test du flux auth/import** : 401 sans cookie, 401 si secret invalide (pas de cookie posé), cookie posé + `status` à `true` si secret valide, 401 de nouveau après expiration.

Le prototype HTML et les CSV sources restent dans le repo comme référence, à ne pas supprimer avant validation complète.

---

## 8. Déploiement

1. `git init` dans `C:\_pCloud\Extensions\annuaire_rfe`, `.gitignore` adapté de financiel-vision.
2. Scaffold Vite (`npm create vite@latest . -- --template react`) ou copie allégée du `package.json` de financiel-vision — ne garder que `react`, `react-dom`, `zustand` + devDeps Tailwind/Vite/ESLint/Vitest (retirer pptxgenjs, pdf-lib, xlsx, recharts, @tiptap/*, date-fns, react-window, non pertinents ici).
3. Copier/adapter `src/index.css`, `vite.config.js`, `eslint.config.js` depuis financiel-vision.
4. Implémenter dans l'ordre : `engine/` (testable isolément) → `store/` → `components/` → `functions/`.
5. `wrangler d1 create annuaire-rfe-db`, reporter le `database_id` dans `wrangler.toml`, exécuter la migration en local puis distant.
6. Secrets : `.dev.vars` en local (`IMPORT_SECRET=...`), `wrangler secret put IMPORT_SECRET` ou Dashboard Cloudflare en production.
7. `wrangler.toml` :
   ```toml
   name = "annuaire-rfe"
   compatibility_date = "2025-01-01"
   compatibility_flags = ["nodejs_compat"]
   pages_build_output_dir = "./dist"

   [[d1_databases]]
   binding = "DB"
   database_name = "annuaire-rfe-db"
   database_id = "<après wrangler d1 create>"

   [vars]
   IMPORT_SESSION_DURATION_HOURS = "2"
   # IMPORT_SECRET configuré via Dashboard ou wrangler secret put — jamais ici
   ```
8. Local : `npm run dev` pour l'UI seule, `npm run build && wrangler pages dev ./dist` pour tester Functions + D1 ensemble.
9. `git remote add origin https://github.com/gudr-cuma/annuaire_rfe.git`, premier commit, `git push -u origin main`.
10. Connecter Cloudflare Pages au repo (Dashboard → Workers & Pages → Create → Pages → Connect to Git), build command `npm run build`, output `dist`.
11. Lier le binding D1 dans Dashboard → Settings → Functions → D1 database bindings (nécessaire en plus de `wrangler.toml` pour les déploiements Git-connectés).
12. Premier import réel des CSV de production via `/import`, puis vérification finale (§7).

---

## 9. README attendu

Sections : présentation, stack et pourquoi (alignée Financiel Vision), configuration du secret d'import (`.dev.vars` en local, `wrangler secret put` en prod, durée de session 2h, **pas** de multi-utilisateurs — un seul secret partagé à garder confidentiel), lancer en local, déployer, mettre à jour les données (flux `/import`), limites connues (volumétrie ~9 000 lignes / stratégie tout-côté-client, pas d'historique des imports — seul le dernier est conservé).

---

## Défauts retenus sur les points laissés ouverts par le brief (réversibles, à signaler à l'utilisateur)

- Jointure SQL en lecture plutôt que table dénormalisée stockée à l'import (plus simple à maintenir au remplacement complet).
- Durée de session import : 2h.
- Export CSV : séparateur `;` + BOM UTF-8, respecte le tri actif, ignore le regroupement (liste plate).

---

## Note de mise en œuvre (post-implémentation)

Ce plan a été exécuté intégralement et validé par un test de non-régression réel (import des vrais CSV `bdd_dossier.csv` / `adresses_de_facturation_002.csv` via `wrangler pages dev` + D1 local) : comptages exacts (8608 dossiers, 9539 lignes facturation), cas limite SIREN `000000000`/`CPXXXXX` correct, dossiers dupliqués par SIREN préservés, dédoublonnage facturation "première occurrence" vérifié sur un cas réel. Le port de dev local a été fixé à `8766` (8788, le port par défaut de wrangler, étant déjà utilisé par un autre outil sur le poste de développement) — voir `package.json` (`pages:dev`) et `README.md`.
