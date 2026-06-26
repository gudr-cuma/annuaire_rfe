# Design — Droits d'accès aux données

**Date :** 2026-06-26  
**Projet :** annuaire_rfe (Cloudflare Pages + D1)  
**Statut :** Approuvé  
**Amende :** [2026-06-26-statuts-utilisateurs-autocomplete-design.md](2026-06-26-statuts-utilisateurs-autocomplete-design.md)

---

## Périmètre

Deux fonctionnalités d'accès aux données, implémentées ensemble (approche B+C) :

1. **Masquage des colonnes référentiels** (`agc`, `nom_agc`, `federation`, `nom_federation`) pour les visiteurs non connectés — côté serveur (données absentes du JSON) et côté client (en-têtes masqués).
2. **Filtrage des lignes par département** pour les utilisateurs connectés avec départements assignés — exclusivement côté serveur (SQL).

---

## Politique d'accès

| Profil | Colonnes référentiels | Lignes visibles |
|---|---|---|
| Non connecté | ❌ absentes du SELECT SQL et masquées en UI | Toutes |
| Connecté, 0 département | ✅ présentes | Toutes |
| Connecté, N départements (rôle `user`) | ✅ présentes | Uniquement `departement ∈ user_departments` |
| Admin | ✅ présentes | Toutes |

Les colonnes statut (`formulaire_rempli`, `justificatifs_envoyes`, `commentaire`) restent inchangées : absentes si non connecté, présentes + `canEdit` par département si connecté.

---

## Backend — `functions/api/dossiers/index.js`

`buildQuery` passe d'un booléen à un objet d'options `{ withStatus, withRef, departements }`.

### `withRef` — colonnes référentiels

Quand `false`, le `SELECT` public omet les 4 colonnes référentiels :

```js
// SELECT public (withRef = false)
SELECT d.siren, d.nom, d.cpostal, d.departement, d.ville,
       d.un_gesdosno, d.dossier,
       f.annuaire, f.plateforme, f.adresse_facturation, f.adresse_active

// SELECT authentifié (withRef = true) — ajoute :
CASE WHEN d.federation <> '' AND fr.code IS NULL THEN '' ELSE d.federation END AS federation,
CASE WHEN d.federation <> '' AND fr.code IS NOT NULL THEN fr.nom ELSE '' END AS nom_federation,
CASE WHEN d.agc <> '' AND ar.code IS NULL THEN '' ELSE d.agc END AS agc,
CASE WHEN d.agc <> '' AND ar.code IS NOT NULL THEN ar.nom ELSE '' END AS nom_agc,
```

### `departements` — filtrage lignes

Quand l'array est non vide, ajoute à la clause `WHERE` :

```sql
AND d.departement IN (?, ?, ...)
```

Les valeurs sont bindées via `...departements`.

### Logique d'appel dans `onRequest`

```js
const user = context.data?.user
const depts = context.data?.userDepartments ?? []
const filterDepts = user && user.role !== 'admin' && depts.length > 0 ? depts : []

const q = buildQuery({ withStatus: !!user, withRef: !!user, departements: filterDepts })
const stmt = filterDepts.length > 0
  ? env.DB.prepare(q).bind(...filterDepts)
  : env.DB.prepare(q)
const result = await stmt.all()
```

---

## Frontend

### `src/engine/columns.js`

Ajout du flag `refColumn: true` sur les 4 colonnes :

```js
{ key: 'agc',           label: 'AGC',           refColumn: true },
{ key: 'nom_agc',       label: 'Nom AGC',        refColumn: true },
{ key: 'federation',    label: 'Fédération',     refColumn: true },
{ key: 'nom_federation', label: 'Nom Fédération', width: 320, refColumn: true },
```

### `src/components/consultation/ResultsTable.jsx`

`MAIN_COLS` est filtré selon l'état de connexion avant les deux splits `_BEFORE`/`_AFTER` :

```js
const user = useAuthStore(s => s.user)
const visibleMainCols = user ? MAIN_COLS : MAIN_COLS.filter(c => !c.refColumn)
// Remplace MAIN_COLS dans MAIN_COLS_BEFORE et MAIN_COLS_AFTER
```

Les splits `MAIN_COLS_BEFORE` / `MAIN_COLS_AFTER` doivent être recalculés dans le composant (pas au module scope) puisqu'ils dépendent de l'état `user`. La constante `ACTIONS_INSERT_INDEX` reste calculable depuis `visibleMainCols`.

### Regroupement — `GroupingControls.jsx`

`src/components/consultation/GroupingControls.jsx` filtre `GROUP_FIELDS` quand `!user` pour masquer les options `agc` et `federation`. `GROUP_FIELDS` dans `columns.js` reste inchangé.

---

## Rechargement des données

`useAuthStore.login()` appelle déjà `loadData()` après connexion, et `logout()` fait de même. Aucune modification nécessaire : les données arrivent avec ou sans colonnes référentiels selon l'état de session au moment du fetch.

---

## Points d'attention à l'implémentation

1. `buildQuery` doit construire la chaîne SQL avec les bons placeholders `?` pour les départements — le nombre de `?` varie selon `departements.length`.
2. Le bind des départements doit utiliser `...filterDepts` spread — D1 accepte des arguments positionnels.
3. Les splits `MAIN_COLS_BEFORE`/`MAIN_COLS_AFTER` calculés au module scope dans `ResultsTable.jsx` doivent être déplacés dans le corps du composant pour réagir à `user`.
4. `GroupedTree.jsx` délègue à `ResultsTable` — aucune modification nécessaire.
5. Tester le cas "0 département" : le filtre SQL ne s'applique pas, toutes les lignes sont renvoyées.

---

## Ce qui ne change pas

- Table `dossiers`, schéma D1 — inchangés
- Middleware, stores, routes auth/admin — inchangés
- Logique `canEditRow` dans `ResultsTable` — inchangée
- `ExclusionsPanel`, `ExportCsvButton` — inchangés
