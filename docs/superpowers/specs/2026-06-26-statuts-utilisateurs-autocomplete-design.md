# Design — Statuts dossiers, gestion utilisateurs, auto-complétion filtres

**Date :** 2026-06-26  
**Projet :** annuaire_rfe (Cloudflare Pages + D1)  
**Statut :** Approuvé

---

## Périmètre

Quatre fonctionnalités indépendantes mais liées par le même système d'authentification :

1. Deux colonnes booléennes persistantes par dossier : **Formulaire rempli** et **Justificatifs envoyés** (checkboxes natives)
2. Une colonne **Commentaire** inline éditable par dossier
3. **Gestion des utilisateurs** avec permissions par département (modèle financiel-vision, Approche A)
4. **Auto-complétion** des champs de filtre texte (client-side)

---

## Décisions clés

- Les données de statut (cases + commentaire) sont **liées au code `dossier`** et survivent aux ré-imports complets (même pattern que `excluded_dossiers`).
- L'import reste protégé par `IMPORT_SECRET` — les deux mécanismes d'auth coexistent sans interférence.
- Les colonnes statut/commentaire sont **entièrement masquées** pour les utilisateurs non connectés.
- Un utilisateur connecté **voit toutes les lignes** mais ne peut modifier que les dossiers de ses départements autorisés. Les autres lignes affichent 🔒 dans ces colonnes.
- L'admin UI est dans l'appli (route `/admin`), accessible uniquement au rôle `admin`.

---

## Schéma D1 — Migration `0003`

### Nouvelles tables

```sql
CREATE TABLE IF NOT EXISTS users (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  email                  TEXT NOT NULL UNIQUE,
  name                   TEXT NOT NULL,
  role                   TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active              INTEGER NOT NULL DEFAULT 1,
  password_hash          TEXT NOT NULL,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  last_login             TEXT,
  failed_login_attempts  INTEGER NOT NULL DEFAULT 0,
  locked_until           TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  last_seen   TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address  TEXT,
  is_revoked  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_departments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  departement  TEXT NOT NULL,
  UNIQUE(user_id, departement)
);
CREATE INDEX IF NOT EXISTS idx_user_depts_user ON user_departments(user_id);

CREATE TABLE IF NOT EXISTS dossier_status (
  dossier_code         TEXT PRIMARY KEY,
  formulaire_rempli    INTEGER NOT NULL DEFAULT 0,
  justificatifs_envoyes INTEGER NOT NULL DEFAULT 0,
  commentaire          TEXT NOT NULL DEFAULT '',
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by           INTEGER REFERENCES users(id) ON DELETE SET NULL
);
```

### Variables d'environnement à ajouter

| Variable | Valeur par défaut | Secret |
|---|---|---|
| `SESSION_SIGNING_KEY` | — | ✅ (jamais versionné) |
| `SESSION_DURATION_HOURS` | `8` | |
| `MAX_LOGIN_ATTEMPTS_PER_IP` | `5` | |
| `RATE_LIMIT_WINDOW_SECONDS` | `900` | |
| `ACCOUNT_LOCKOUT_ATTEMPTS` | `10` | |
| `ACCOUNT_LOCKOUT_HOURS` | `1` | |
| `PBKDF2_ITERATIONS` | `100000` | |

Binding KV à créer : `RATE_LIMIT_KV` (utilisé pour le rate limiting login par IP).

---

## Backend — Cloudflare Functions

### Librairies (`functions/_lib/`)

| Fichier | Rôle |
|---|---|
| `password.js` | Hash PBKDF2-SHA256 100k itérations, verify temps constant, dummyVerify anti timing-leak |
| `session.js` | UUID session, cookie httpOnly `rfe_session` (Secure, SameSite=Strict), parsing Cookie, getClientIp |
| `ratelimit.js` | Rate limiting login via KV (`ratelimit:login:<ip>`, TTL glissant) |
| `db.js` | Helpers D1 : getUser, getUserDepartments, createSession, verifySession, etc. |
| `responses.js` | Existant — ajout headers sécurité : X-Content-Type-Options, X-Frame-Options, Referrer-Policy |

### Middleware

`functions/api/_middleware.js` — s'exécute sur toutes les routes `/api/*` sauf `/api/auth/login` :
- Lit le cookie `rfe_session`, vérifie la session en D1
- Injecte `context.data.user` et `context.data.userDepartments`
- Bloque avec 401 si pas de session valide (sauf routes exclues)
- Bloque avec 403 si accès à `/api/admin/*` et `role !== 'admin'`

### Routes auth

| Méthode | Route | Comportement |
|---|---|---|
| `POST` | `/api/auth/login` | Rate-limit IP via KV, PBKDF2, verrouillage compte après N échecs, crée session D1, pose cookie `rfe_session` |
| `POST` | `/api/auth/logout` | Révoque session courante, efface cookie |
| `GET` | `/api/auth/me` | Renvoie `{ user, departments }` — appelé au montage de l'app pour restaurer la session |

### Routes admin (role `admin` requis)

| Méthode | Route | Comportement |
|---|---|---|
| `GET` | `/api/admin/users` | Liste tous les users avec leurs départements |
| `POST` | `/api/admin/users` | Crée un user (email, name, password, role, is_active) |
| `GET` | `/api/admin/users/[id]` | Détail user + sessions actives |
| `PUT` | `/api/admin/users/[id]` | Modifie name/email/password/role/is_active |
| `DELETE` | `/api/admin/users/[id]` | Supprime user (cascade sessions + departments) |
| `PUT` | `/api/admin/users/[id]/departments` | Reçoit `"35;44;22"`, remplace toutes les lignes `user_departments` (DELETE puis INSERT batch) |

### Routes status

| Méthode | Route | Comportement |
|---|---|---|
| `PATCH` | `/api/status/[dossier_code]` | Met à jour `formulaire_rempli`, `justificatifs_envoyes` et/ou `commentaire`. Vérifie que le département du dossier est dans `userDepartments`. UPSERT dans `dossier_status`. |

### Modification GET `/api/dossiers`

La requête SQL ajoute un `LEFT JOIN dossier_status` uniquement si la session est valide (le middleware injecte `context.data.user`). Si non authentifié, les champs `formulaire_rempli`, `justificatifs_envoyes`, `commentaire` sont absents de la réponse.

---

## Frontend

### Stores

**`useAuthStore.js`** (nouveau) — parallèle à `useImportAuthStore`, gère :
- `user` (null si non connecté), `departments` (array), `isLoading`, `error`
- Actions : `init()`, `login(email, password)`, `logout()`
- `init()` appelle `GET /api/auth/me` au montage de l'app

**`useImportAuthStore.js`** — inchangé, continue de gérer l'auth import via `IMPORT_SECRET`.

### Composants nouveaux

**`LoginModal.jsx`** — modale flottante, email + mot de passe, affiche erreur. Déclenchée par clic sur "Se connecter" dans le header.

**`AdminPage.jsx`** — route `/admin`, visible seulement si `role === 'admin'` :
- Tableau des utilisateurs (nom, email, rôle, actif, départements)
- Bouton "Nouveau" → formulaire inline ou modale
- Actions par ligne : Modifier, Supprimer
- Champ départements : input texte libre `"35;44;22"` — split côté serveur
- Changement de mot de passe : champ optionnel dans le formulaire d'édition

### Modifications existantes

**`columns.js`** — ajout des 3 colonnes avec flag `statusColumn: true` :
```js
{ key: 'formulaire_rempli', label: 'Formulaire', statusColumn: true },
{ key: 'justificatifs_envoyes', label: 'Justificatifs', statusColumn: true },
{ key: 'commentaire', label: 'Commentaire', statusColumn: true },
```
Également ajoutés dans `BOOL_COLUMNS` pour `formulaire_rempli` et `justificatifs_envoyes`.

**`ResultsTable.jsx`** — quand connecté (`useAuthStore`) :
- Les 3 colonnes status apparaissent à droite du tableau
- Pour une ligne dont le `departement` est dans `userDepartments` :
  - Checkbox native `<input type="checkbox">` avec `accent-color: #FF8200`, `onChange` → `PATCH /api/status/[dossier]`
  - Commentaire : cellule cliquable → `<input type="text">` → `onBlur` → `PATCH /api/status/[dossier]`
- Pour une ligne hors-périmètre : affichage 🔒, non interactif
- L'admin voit toutes les lignes comme modifiables (pas de restriction département)

**`ColumnFilters.jsx`** — deux évolutions :
1. Les colonnes `formulaire_rempli` et `justificatifs_envoyes` s'ajoutent aux filtres (select Oui/Non/Tous) **uniquement si connecté**
2. Autocomplete sur tous les champs texte : `<datalist id="dl-{key}">` peuplé de toutes les valeurs uniques non vides de la colonne dans `rawRows`, calculé avec `useMemo`

**`AppHeader.jsx`** :
- Si non connecté : bouton "Se connecter"
- Si connecté : nom de l'utilisateur + "Déconnexion" + lien "Admin" si `role === 'admin'`

---

## Ce qui ne change pas

- Import (IMPORT_SECRET, `useImportAuthStore`, routes `/api/import/*`) — inchangé
- Structure `COLUMNS`, `GROUP_FIELDS`, moteur de filtres/tri/groupe — inchangé sauf ajout des 3 colonnes
- `ExclusionsPanel`, `GroupedTree`, `ExportCsvButton` — inchangés

---

## Points d'attention à l'implémentation

1. Le `PATCH /api/status/[dossier_code]` doit récupérer le département du dossier depuis la table `dossiers` pour vérifier les droits — jointure nécessaire.
2. Le `GET /api/dossiers` existant a un `Cache-Control: public, max-age=60` à supprimer ou conditionner quand les données status sont incluses (les données varient par session).
3. `GroupedTree.jsx` affiche aussi des lignes — il faudra lui passer les mêmes colonnes status et la même logique de permission que `ResultsTable`.
4. Le premier compte admin devra être créé directement en D1 via le dashboard Cloudflare (seed SQL dans la migration ou script séparé).
