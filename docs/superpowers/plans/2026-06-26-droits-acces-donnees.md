# Droits d'accès aux données — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Masquer les 4 colonnes référentiels (agc/fédération) aux visiteurs non connectés, et filtrer les lignes par département côté serveur pour les utilisateurs connectés.

**Architecture:** Backend : refactoring de `buildQuery` dans `GET /api/dossiers` pour accepter `{ withStatus, withRef, departements }` — les données sensibles ne quittent pas le serveur. Frontend : flag `refColumn` dans `columns.js`, filtrage des colonnes dans `ResultsTable.jsx` et des options de regroupement dans `GroupingControls.jsx`.

**Tech Stack:** Cloudflare Pages Functions + D1 (backend), React 19 + Zustand (frontend), Vitest + @testing-library/react (tests).

---

## Fichiers modifiés

| Fichier | Type | Changement |
|---|---|---|
| `functions/api/dossiers/index.js` | Modifier | Refactoring `buildQuery`, export pour testabilité, logique dept filter |
| `src/engine/columns.js` | Modifier | Ajout flag `refColumn: true` sur 4 colonnes |
| `src/components/consultation/ResultsTable.jsx` | Modifier | Splits `MAIN_COLS_BEFORE/AFTER` déplacés dans le composant, filtrés sur `user` |
| `src/components/consultation/GroupingControls.jsx` | Modifier | Filtre `GROUP_FIELDS` sur `user` |
| `src/__tests__/dossiers.test.js` | Créer | Tests unitaires de `buildQuery` |
| `src/__tests__/ResultsTable.test.jsx` | Créer | Tests RTL colonnes visibles/masquées |
| `src/__tests__/GroupingControls.test.jsx` | Créer | Tests RTL options de regroupement |

---

## Task 1 : Backend — `buildQuery` avec contrôle colonnes et filtrage départements (TDD)

**Fichiers :**
- Créer : `src/__tests__/dossiers.test.js`
- Modifier : `functions/api/dossiers/index.js`

- [ ] **Étape 1 : Écrire les tests `buildQuery` (doivent échouer)**

Créer `src/__tests__/dossiers.test.js` :

```js
import { describe, it, expect } from 'vitest'
import { buildQuery } from '../../functions/api/dossiers/index.js'

describe('buildQuery', () => {
  it('sans options : pas de colonnes ref aliasées, pas de statut, pas de filtre dept', () => {
    const sql = buildQuery({})
    // d.federation apparaît dans les JOINs même sans withRef — on vérifie l'alias SELECT
    expect(sql).not.toMatch(/\bAS federation\b/)
    expect(sql).not.toMatch(/\bAS nom_federation\b/)
    expect(sql).not.toMatch(/\bAS agc\b/)
    expect(sql).not.toMatch(/\bAS nom_agc\b/)
    expect(sql).not.toMatch(/formulaire_rempli/)
    expect(sql).not.toMatch(/IN \(/)
    expect(sql).toMatch(/WHERE ex\.dossier_code IS NULL\s*ORDER BY/)
  })

  it('withRef: true — inclut les 4 colonnes référentiels aliasées dans le SELECT', () => {
    const sql = buildQuery({ withRef: true })
    expect(sql).toMatch(/\bAS federation\b/)
    expect(sql).toMatch(/\bAS nom_federation\b/)
    expect(sql).toMatch(/\bAS agc\b/)
    expect(sql).toMatch(/\bAS nom_agc\b/)
  })

  it('withStatus: true — inclut le LEFT JOIN dossier_status et les 3 colonnes statut', () => {
    const sql = buildQuery({ withStatus: true })
    expect(sql).toMatch(/LEFT JOIN dossier_status/)
    expect(sql).toMatch(/formulaire_rempli/)
    expect(sql).toMatch(/justificatifs_envoyes/)
    expect(sql).toMatch(/commentaire/)
  })

  it('departements non vide — ajoute IN (?, ?) avec le bon nombre de placeholders', () => {
    const sql = buildQuery({ departements: ['35', '44', '56'] })
    expect(sql).toMatch(/AND d\.departement IN \(\?, \?, \?\)/)
  })

  it('departements vide — pas de filtre IN', () => {
    const sql = buildQuery({ departements: [] })
    expect(sql).not.toMatch(/IN \(/)
  })

  it('toutes les options activées', () => {
    const sql = buildQuery({ withStatus: true, withRef: true, departements: ['22'] })
    expect(sql).toMatch(/nom_agc/)
    expect(sql).toMatch(/formulaire_rempli/)
    expect(sql).toMatch(/AND d\.departement IN \(\?\)/)
  })
})
```

- [ ] **Étape 2 : Confirmer l'échec (la fonction exportée n'existe pas encore)**

```
npm test -- --reporter=verbose src/__tests__/dossiers.test.js
```

Résultat attendu : `SyntaxError` ou `buildQuery is not a function` (l'export n'existe pas).

- [ ] **Étape 3 : Réécrire `functions/api/dossiers/index.js`**

Remplacer intégralement le contenu du fichier :

```js
import { json, error, methodNotAllowed } from '../../_lib/responses.js'

// Jointure gauche dossiers ⟕ facturation par SIREN, "première occurrence" = MIN(id)
// + jointure référentiels agc_ref/federation_ref (code invalide masqué, pas la ligne)
// + exclusion des dossiers marqués dans excluded_dossiers

export function buildQuery({ withStatus = false, withRef = false, departements = [] }) {
  const refCols = withRef ? `
         CASE WHEN d.federation <> '' AND fr.code IS NULL THEN '' ELSE d.federation END AS federation,
         CASE WHEN d.federation <> '' AND fr.code IS NOT NULL THEN fr.nom ELSE '' END AS nom_federation,
         CASE WHEN d.agc <> '' AND ar.code IS NULL THEN '' ELSE d.agc END AS agc,
         CASE WHEN d.agc <> '' AND ar.code IS NOT NULL THEN ar.nom ELSE '' END AS nom_agc,` : ''

  const statusCols = withStatus ? `
    , COALESCE(ds.formulaire_rempli, 0)     AS formulaire_rempli
    , COALESCE(ds.justificatifs_envoyes, 0) AS justificatifs_envoyes
    , COALESCE(ds.commentaire, '')          AS commentaire` : ''

  const statusJoin = withStatus
    ? 'LEFT JOIN dossier_status ds ON ds.dossier_code = d.dossier'
    : ''

  const deptWhere = departements.length > 0
    ? `AND d.departement IN (${departements.map(() => '?').join(', ')})`
    : ''

  return `
  SELECT d.siren, d.nom, d.cpostal, d.departement, d.ville,
         d.un_gesdosno, d.dossier,
         ${refCols}
         f.annuaire, f.plateforme, f.adresse_facturation, f.adresse_active
         ${statusCols}
  FROM dossiers d
  LEFT JOIN (
    SELECT f1.* FROM facturation f1
    WHERE f1.id = (SELECT MIN(f2.id) FROM facturation f2 WHERE f2.siren = f1.siren)
  ) f ON f.siren = d.siren
  LEFT JOIN agc_ref ar ON ar.code = d.agc AND d.agc <> ''
  LEFT JOIN federation_ref fr ON fr.code = d.federation AND d.federation <> ''
  LEFT JOIN excluded_dossiers ex ON ex.dossier_code = d.dossier
  ${statusJoin}
  WHERE ex.dossier_code IS NULL ${deptWhere}
  ORDER BY d.nom COLLATE NOCASE
  `
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET') return methodNotAllowed()

  const user = context.data?.user
  const depts = context.data?.userDepartments ?? []
  const filterDepts = user && user.role !== 'admin' && depts.length > 0 ? depts : []

  const authenticated = !!user
  const cacheControl = authenticated ? 'private, no-store' : 'public, max-age=60'

  try {
    const sql = buildQuery({ withStatus: authenticated, withRef: authenticated, departements: filterDepts })
    const stmt = filterDepts.length > 0
      ? env.DB.prepare(sql).bind(...filterDepts)
      : env.DB.prepare(sql)
    const result = await stmt.all()
    return json(
      { rows: result.results, count: result.results.length },
      200,
      { 'Cache-Control': cacheControl }
    )
  } catch (err) {
    return error('Erreur de lecture des données : ' + err.message, 500)
  }
}
```

- [ ] **Étape 4 : Confirmer que les tests passent**

```
npm test -- --reporter=verbose src/__tests__/dossiers.test.js
```

Résultat attendu : `6 tests passed`.

- [ ] **Étape 5 : Vérifier que tous les tests existants passent encore**

```
npm test
```

Résultat attendu : tous les tests précédents (csv, filterSort, group, merge, password, session, stats) toujours verts.

- [ ] **Étape 6 : Commit**

```bash
git add functions/api/dossiers/index.js src/__tests__/dossiers.test.js
git commit -m "feat: buildQuery — withRef + filtrage lignes par département"
```

---

## Task 2 : Frontend — colonnes référentiels dans `columns.js` + `ResultsTable.jsx` (TDD)

**Fichiers :**
- Créer : `src/__tests__/ResultsTable.test.jsx`
- Modifier : `src/engine/columns.js`
- Modifier : `src/components/consultation/ResultsTable.jsx`

- [ ] **Étape 1 : Écrire le test `ResultsTable` (doit échouer)**

Créer `src/__tests__/ResultsTable.test.jsx` :

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultsTable } from '../components/consultation/ResultsTable.jsx'
import useAuthStore from '../store/useAuthStore.js'

vi.mock('../store/useDataStore.js', () => ({
  default: (selector) => selector({
    sortKey: '', sortDir: 'asc', setSort: () => {},
    excludeDossier: () => {}, updateRowStatus: () => {},
  }),
}))

vi.mock('../store/useImportAuthStore.js', () => ({
  default: (selector) => selector({ authenticated: false }),
}))

vi.mock('../store/useAuthStore.js', () => ({
  default: vi.fn(),
}))

const rows = [
  {
    dossier: 'D1', siren: '1', nom: 'Test SAS', annuaire: 0, plateforme: 0,
    adresse_active: 0, departement: '35', cpostal: '35000', ville: 'Rennes',
    agc: 'A01', nom_agc: 'AGC Bretagne', federation: 'F01', nom_federation: 'Fédé Test',
    un_gesdosno: '', adresse_facturation: '',
  },
]

describe('ResultsTable — visibilité colonnes référentiels', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('masque les colonnes AGC, Nom AGC, Fédération, Nom Fédération pour un visiteur non connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: null, departments: [] }))
    render(<ResultsTable rows={rows} />)
    expect(screen.queryByRole('columnheader', { name: /^AGC$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Nom AGC$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Fédération$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^Nom Fédération$/i })).not.toBeInTheDocument()
  })

  it('affiche les colonnes AGC, Nom AGC, Fédération, Nom Fédération pour un utilisateur connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: { id: 1, role: 'user' }, departments: ['35'] }))
    render(<ResultsTable rows={rows} />)
    expect(screen.getByRole('columnheader', { name: /^AGC$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Nom AGC$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Fédération$/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /^Nom Fédération$/i })).toBeInTheDocument()
  })
})
```

- [ ] **Étape 2 : Confirmer l'échec**

```
npm test -- --reporter=verbose src/__tests__/ResultsTable.test.jsx
```

Résultat attendu : `FAIL` — les colonnes AGC/Fédération sont affichées même pour `user: null`.

- [ ] **Étape 3 : Ajouter `refColumn: true` dans `src/engine/columns.js`**

Modifier les 4 lignes concernées (actuellement lignes 10-15) :

```js
  { key: 'agc', label: 'AGC', refColumn: true },
  { key: 'nom_agc', label: 'Nom AGC', refColumn: true },
  { key: 'federation', label: 'Fédération', refColumn: true },
  { key: 'nom_federation', label: 'Nom Fédération', width: 320, refColumn: true },
```

- [ ] **Étape 4 : Refactoriser `src/components/consultation/ResultsTable.jsx`**

Supprimer les lignes 12-14 au niveau module :

```js
// SUPPRIMER ces 3 lignes du module scope :
const ACTIONS_INSERT_INDEX = MAIN_COLS.findIndex(c => c.key === ACTIONS_BEFORE_KEY)
const MAIN_COLS_BEFORE = MAIN_COLS.slice(0, ACTIONS_INSERT_INDEX)
const MAIN_COLS_AFTER = MAIN_COLS.slice(ACTIONS_INSERT_INDEX)
```

Dans le corps de la fonction `ResultsTable`, après la ligne `const departments = useAuthStore(s => s.departments)`, ajouter :

```js
  const visibleMainCols = user ? MAIN_COLS : MAIN_COLS.filter(c => !c.refColumn)
  const insertIdx = visibleMainCols.findIndex(c => c.key === ACTIONS_BEFORE_KEY)
  const colsBefore = visibleMainCols.slice(0, insertIdx)
  const colsAfter = visibleMainCols.slice(insertIdx)
```

Dans le JSX du composant, remplacer tous les usages :
- `MAIN_COLS_BEFORE` → `colsBefore`
- `MAIN_COLS_AFTER` → `colsAfter`

Il y a 4 occurrences (2 dans `<thead>`, 2 dans `<tbody>`) :

```jsx
{/* Dans thead — remplacer : */}
{MAIN_COLS_BEFORE.map(c => (
  <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
))}
{/* par : */}
{colsBefore.map(c => (
  <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
))}

{/* et : */}
{MAIN_COLS_AFTER.map(c => (
  <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
))}
{/* par : */}
{colsAfter.map(c => (
  <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
))}

{/* Dans tbody — même substitution sur les 2 DataCell maps */}
{MAIN_COLS_BEFORE.map(c => <DataCell key={c.key} c={c} row={r} />)}
{/* par : */}
{colsBefore.map(c => <DataCell key={c.key} c={c} row={r} />)}

{MAIN_COLS_AFTER.map(c => <DataCell key={c.key} c={c} row={r} />)}
{/* par : */}
{colsAfter.map(c => <DataCell key={c.key} c={c} row={r} />)}
```

- [ ] **Étape 5 : Confirmer que les tests passent**

```
npm test -- --reporter=verbose src/__tests__/ResultsTable.test.jsx
```

Résultat attendu : `2 tests passed`.

- [ ] **Étape 6 : Vérifier la suite complète**

```
npm test
```

Résultat attendu : tous les tests verts.

- [ ] **Étape 7 : Commit**

```bash
git add src/engine/columns.js src/components/consultation/ResultsTable.jsx src/__tests__/ResultsTable.test.jsx
git commit -m "feat: masquer colonnes référentiels pour visiteurs non connectés"
```

---

## Task 3 : Frontend — options de regroupement dans `GroupingControls.jsx` (TDD)

**Fichiers :**
- Créer : `src/__tests__/GroupingControls.test.jsx`
- Modifier : `src/components/consultation/GroupingControls.jsx`

- [ ] **Étape 1 : Écrire le test `GroupingControls` (doit échouer)**

Créer `src/__tests__/GroupingControls.test.jsx` :

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupingControls } from '../components/consultation/GroupingControls.jsx'
import useAuthStore from '../store/useAuthStore.js'

vi.mock('../store/useDataStore.js', () => ({
  default: (selector) => selector({
    group: ['', '', ''],
    setGroupLevel: () => {},
    setAllGroupsExpanded: () => {},
  }),
}))

vi.mock('../store/useAuthStore.js', () => ({
  default: vi.fn(),
}))

describe('GroupingControls — options de regroupement', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('masque les options AGC et Fédération pour un visiteur non connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: null }))
    render(<GroupingControls allGroupIds={[]} />)
    expect(screen.queryAllByRole('option', { name: /^Niveau \d+ : AGC$/ })).toHaveLength(0)
    expect(screen.queryAllByRole('option', { name: /^Niveau \d+ : Fédération$/ })).toHaveLength(0)
  })

  it('affiche les options AGC et Fédération pour un utilisateur connecté', () => {
    useAuthStore.mockImplementation(selector => selector({ user: { id: 1 } }))
    render(<GroupingControls allGroupIds={[]} />)
    // 3 selects × 1 option AGC chacun = 3
    expect(screen.getAllByRole('option', { name: /^Niveau \d+ : AGC$/ })).toHaveLength(3)
    expect(screen.getAllByRole('option', { name: /^Niveau \d+ : Fédération$/ })).toHaveLength(3)
  })

  it('les options Aucun regroupement et Département sont toujours présentes', () => {
    useAuthStore.mockImplementation(selector => selector({ user: null }))
    render(<GroupingControls allGroupIds={[]} />)
    expect(screen.getAllByRole('option', { name: /Aucun regroupement/ })).toHaveLength(3)
    expect(screen.getAllByRole('option', { name: /Département/ })).toHaveLength(3)
  })
})
```

- [ ] **Étape 2 : Confirmer l'échec**

```
npm test -- --reporter=verbose src/__tests__/GroupingControls.test.jsx
```

Résultat attendu : `FAIL` — les options AGC/Fédération sont visibles même pour `user: null`.

- [ ] **Étape 3 : Modifier `src/components/consultation/GroupingControls.jsx`**

Ajouter l'import de `useAuthStore` et le filtrage des options. Remplacer le fichier entier :

```jsx
import { GROUP_FIELDS } from '../../engine/columns.js'
import useDataStore from '../../store/useDataStore.js'
import useAuthStore from '../../store/useAuthStore.js'

const REF_GROUP_KEYS = new Set(['agc', 'federation'])

const selectStyle = {
  padding: '7px 10px',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#1A202C',
  outline: 'none',
  background: '#FFFFFF',
}

const buttonStyle = {
  padding: '7px 12px',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1A202C',
  background: '#FFFFFF',
  cursor: 'pointer',
}

export function GroupingControls({ allGroupIds }) {
  const group = useDataStore(s => s.group)
  const setGroupLevel = useDataStore(s => s.setGroupLevel)
  const setAllGroupsExpanded = useDataStore(s => s.setAllGroupsExpanded)
  const user = useAuthStore(s => s.user)

  const visibleGroupFields = user
    ? GROUP_FIELDS
    : GROUP_FIELDS.filter(g => !REF_GROUP_KEYS.has(g.key))

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
      {[0, 1, 2].map(idx => (
        <select
          key={idx}
          value={group[idx]}
          onChange={e => setGroupLevel(idx, e.target.value)}
          style={selectStyle}
        >
          {visibleGroupFields.map(g => (
            <option key={g.key} value={g.key}>{`Niveau ${idx + 1} : ${g.label}`}</option>
          ))}
        </select>
      ))}
      <button type="button" style={buttonStyle} onClick={() => setAllGroupsExpanded(allGroupIds, true)}>
        Tout déplier
      </button>
      <button type="button" style={buttonStyle} onClick={() => setAllGroupsExpanded(allGroupIds, false)}>
        Tout replier
      </button>
    </div>
  )
}

export default GroupingControls
```

- [ ] **Étape 4 : Confirmer que les tests passent**

```
npm test -- --reporter=verbose src/__tests__/GroupingControls.test.jsx
```

Résultat attendu : `3 tests passed`.

- [ ] **Étape 5 : Vérifier la suite complète**

```
npm test
```

Résultat attendu : tous les tests verts (10 suites au total).

- [ ] **Étape 6 : Commit**

```bash
git add src/components/consultation/GroupingControls.jsx src/__tests__/GroupingControls.test.jsx
git commit -m "feat: masquer options regroupement AGC/fédération pour visiteurs non connectés"
```

---

## Vérification manuelle finale

Après les 3 tasks, tester en dev :

1. **Visiteur non connecté** : lancer `npm run dev`, ouvrir l'app sans se connecter → colonnes AGC, Nom AGC, Fédération, Nom Fédération absentes de la table, options AGC/Fédération absentes des selects de regroupement.

2. **Utilisateur connecté sans département** : se connecter avec un compte ayant 0 département → toutes les colonnes apparaissent, toutes les lignes visibles.

3. **Utilisateur connecté avec départements `[35, 44]`** : toutes les colonnes apparaissent, seules les lignes des départements 35 et 44 sont affichées.

4. **Admin** : toutes les colonnes, toutes les lignes.
