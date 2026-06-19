# Annuaire RFE — colonnes, données de référence AGC/Fédération, imports découplés, exclusions

## Contexte

Le tableau actuel (`annuaire_rfe`, React + Cloudflare D1/Pages/Functions) affiche les dossiers CUMA fusionnés avec un fichier "facturation". Trois colonnes ont des libellés longs qui prennent trop de place ; on veut les renommer, les rapprocher de la colonne Nom, et réduire leur largeur (le tableau n'a aujourd'hui **aucune largeur de colonne explicite**, layout 100% auto).

Par ailleurs, deux nouveaux référentiels externes (codes AGC et codes Fédération → nom long `UA_LIB100`) doivent être liés au fichier dossier pour afficher un nom au lieu d'un simple code, et ces référentiels changent rarement : on veut les "mémoriser" dans le projet plutôt que de les re-uploader à chaque mise à jour du fichier principal. Le fichier "facturation" (renommé "Annuaire" côté libellé) change souvent ; le fichier "dossiers" et les deux référentiels changent rarement — l'import doit donc devenir indépendant par fichier plutôt qu'un seul formulaire bloquant (dossiers + facturation ensemble).

Enfin, on veut pouvoir exclure manuellement certaines lignes du tableau final, de façon persistante (l'exclusion doit survivre à un ré-import du fichier dossiers), avec un moyen de consulter et annuler ces exclusions.

J'ai vérifié sur les données réelles (`bdd_dossier.csv`) que les codes AGC/Fédération sont des chaînes numériques **à 6 chiffres** (pas 3 comme indiqué initialement) et qu'ils correspondent en **valeur exacte complète** aux codes des fichiers `AGC001.csv`/`federation001.csv` fournis (ex. `201762` apparaît identique dans les deux). La jointure se fait donc par égalité stricte sur la chaîne complète.

Décisions déjà validées avec l'utilisateur :
- Si un code AGC/Fédération renseigné dans le fichier dossier n'a pas de correspondance dans le référentiel → on **masque uniquement ce code** (AGC/Fédération et Nom AGC/Fédération vides), la ligne reste affichée. (La plupart des dossiers n'ont pas de code AGC, donc exclure la ligne entière viderait quasiment tout le tableau.)
- La gestion des exclusions (exclure / lister / réinclure) se fait **directement dans le tableau de consultation principal**, visible seulement en session admin.

## Schéma de données — nouvelle migration

Nouveau fichier `migrations/0002_refdata_exclusions_meta.sql` (ne pas modifier `0001_initial.sql`) :

- `agc_ref(code TEXT PRIMARY KEY, nom TEXT, imported_at TEXT)` — seedée par des `INSERT` littéraux générés à partir du contenu de `AGC001.csv` (26 lignes, format `<code>;<UA_LIB100>`, le libellé est stocké tel quel y compris le suffixe `| code postal` quand présent).
- `federation_ref(code TEXT PRIMARY KEY, nom TEXT, imported_at TEXT)` — même principe, seedée depuis `federation001.csv` (92 lignes).
- `excluded_dossiers(dossier_code TEXT PRIMARY KEY, excluded_at TEXT)` — clé sur la colonne **`dossier`** (clé naturelle stable d'une ligne, pas l'`id` auto-incrémenté qui change à chaque ré-import puisque la table `dossiers` est entièrement vidée/réinsérée).
- `import_meta` reconstruite en table à une ligne par jeu de données : `import_meta(dataset TEXT PRIMARY KEY CHECK (dataset IN ('dossiers','facturation','agc','federation')), imported_at TEXT, row_count INTEGER, filename TEXT)` (remplace l'ancienne table à une seule ligne fixe, puisque les imports deviennent indépendants).

Échapper les apostrophes dans les libellés (`L'AVEYRON` → `L''AVEYRON`) lors de la génération des `INSERT`.

## API — Cloudflare Functions

- **`functions/api/dossiers/index.js`** : la requête de lecture ajoute deux `LEFT JOIN` (`agc_ref`, `federation_ref`) avec un `CASE` qui ne renvoie `agc`/`nom_agc` (resp. `federation`/`nom_federation`) que si une correspondance existe ou si le code est vide à l'origine ; ajoute un `LEFT JOIN excluded_dossiers ... WHERE ex.dossier_code IS NULL` pour filtrer les lignes exclues. Forme de réponse inchangée (`{ rows, count }`), avec deux champs en plus par ligne.
- **`functions/_lib/importHandlers.js`** (nouveau) : factorise ce qui est dupliqué 4 fois — vérification de session (`getImportSessionCookie`+`verifySession`, repris de l'actuel `upload.js`), `chunk()`, `readCsvFile()`, et un `upsertImportMeta(db, dataset, importedAt, rowCount, filename)` paramétré par `dataset`.
- **Remplacer `functions/api/import/upload.js`** par 4 routes indépendantes, chacune ne remplaçant qu'une seule table et qu'une seule ligne `import_meta` :
  - `upload-dossiers.js` (8 colonnes, `;`) → table `dossiers`
  - `upload-annuaire.js` (5 colonnes, `,` — c'est l'actuel fichier "facturation", renommé seulement dans le libellé utilisateur) → table `facturation`
  - `upload-agc.js` (2 colonnes, `;`) → table `agc_ref`
  - `upload-federation.js` (2 colonnes, `;`) → table `federation_ref`
  - Chaque route reçoit `formData.get('file')` (un seul champ, contrat simplifié par rapport à aujourd'hui).
- **`functions/api/meta/index.js`** : renvoie désormais `{ dossiers, facturation, agc, federation }` (chacun `{ imported_at, row_count, filename } | null`) au lieu de l'ancienne forme plate.
- **Nouveau `functions/api/exclusions/index.js`** : `GET` (admin) liste les exclusions avec contexte (`LEFT JOIN dossiers` pour nom/agc/ville — gérer le cas où le `dossier_code` n'existe plus après un ré-import) ; `POST` (admin) ajoute une exclusion (`{ dossier_code }`, idempotent via `ON CONFLICT DO NOTHING`).
- **Nouveau `functions/api/exclusions/remove.js`** : `POST` (admin) supprime une exclusion (`{ dossier_code }`) — un chemin fixe plutôt qu'une route dynamique, plus simple que de gérer l'encodage d'un paramètre d'URL.

## Frontend

- **`src/engine/columns.js`** — nouvel ordre/libellés/largeurs, seule source de vérité pour le tableau, les filtres (`ColumnFilters.jsx` génère un filtre par colonne automatiquement) et l'export CSV :
  `siren, nom(147px), annuaire("Annuaire", ~100px), plateforme("PA", ~90px), adresse_active("Adr. active", ~110px), departement, cpostal, ville, agc, nom_agc("Nom AGC"), federation, nom_federation("Nom Fédération"), un_gesdosno, dossier, adresse_facturation`.
  (Les libellés restent en casse normale ; la mise en majuscules vient déjà du CSS `textTransform: uppercase` du `<th>`.) `BOOL_COLUMNS`/`GROUP_FIELDS` inchangés.
- **`src/components/consultation/ResultsTable.jsx`** :
  - applique `width`/`maxWidth` + `overflow:hidden; textOverflow:ellipsis` (pas `table-layout:fixed`, pour ne pas casser l'auto-layout des colonnes non contraintes) uniquement sur les colonnes ayant un `width` défini ; ajoute `title={valeur}` sur ces cellules pour garder le texte complet au survol.
  - ajoute une colonne "Actions" avec un bouton "Exclure" par ligne, visible uniquement si `useImportAuthStore(s => s.authenticated)` est vrai (la colonne est omise entièrement sinon, pas juste masquée).
- **Nouveau `src/components/consultation/ExclusionsPanel.jsx`** : panneau repliable (`<details>`, cohérent avec les filtres existants), visible seulement en admin, charge `GET /api/exclusions`, bouton "Réinclure" par ligne → `POST /api/exclusions/remove`.
- **`src/store/useDataStore.js`** : ajoute `excludeDossier(dossierCode)` (retire la ligne localement de `rawRows`, pas de refetch) et `reincludeDossier(dossierCode)` (refetch via `loadData()` pour récupérer la forme jointe complète).
- **`src/App.jsx`** : appelle `useImportAuthStore.init()` au niveau racine (au lieu de seulement dans `ImportPage.jsx`) pour que le bouton "Exclure" puisse apparaître sans visite préalable de `/import`.
- **Import — remplacer `ImportUploadForm.jsx`** par un composant générique **`SingleFileUploadWidget.jsx`** (props : `title, helpText, endpoint, datasetKey`) instancié 4 fois dans `ImportPage.jsx` (Dossiers / Annuaire / AGC / Fédération), chacun avec son propre état et son propre appel à son endpoint. Gère le `401` → `logout()` global, comme aujourd'hui.
- **`ImportMetaBanner.jsx`** : adapté à la nouvelle forme `{dossiers, facturation, agc, federation}` ; mode compact par jeu de données (prop `datasetKey`) pour chaque widget, et vue complète (les 4) sur la page de consultation.

## Fichiers critiques

- `migrations/0001_initial.sql` (référence, ne pas modifier) + nouveau `migrations/0002_refdata_exclusions_meta.sql`
- `functions/api/dossiers/index.js` (requête de lecture)
- `functions/api/import/upload.js` (remplacé par 4 routes + `functions/_lib/importHandlers.js`)
- `src/engine/columns.js` (config colonnes)
- `src/components/consultation/ResultsTable.jsx` (largeurs + action Exclure)
- `src/store/useImportAuthStore.js` / `src/App.jsx` (init global)

## Vérification

1. `npm run d1:migrate:local` (0001) puis exécuter la nouvelle migration 0002 ; vérifier les comptages (`SELECT count(*) FROM agc_ref` ≈ 26, `federation_ref` ≈ 92).
2. `npm run build && npm run pages:dev` (port 8766) ; vérifier visuellement l'ordre/largeur des colonnes.
3. Vérifier qu'un code AGC connu (ex. `215356`) affiche bien le `Nom AGC` correspondant, et que le filtre texte sur cette colonne fonctionne.
4. Forcer un code AGC inconnu sur une ligne (`UPDATE dossiers SET agc='999999' ...` en local) et vérifier que `agc`/`nom_agc` sont vides mais que la ligne reste présente (même `count` total).
5. Ré-importer uniquement le fichier AGC (widget dédié) et vérifier via `/api/meta` que seul `agc.imported_at` change, pas `dossiers`/`facturation`/`federation`.
6. En session admin : exclure une ligne (note son `dossier`), vérifier sa disparition immédiate ; ré-importer le fichier dossiers en entier ; vérifier que la ligne reste absente (clé `dossier` stable) ; ouvrir "Voir les exclus", cliquer "Réinclure", vérifier qu'elle réapparaît dans le tableau.
7. `npm test` (suite Vitest existante, pas de régression attendue) et `npm run lint`.

## Statut

Implémenté et vérifié intégralement (API directe + navigateur live via preview) le 19/06/2026. Voir `CHANGELOG.md` pour le résumé des changements livrés.
