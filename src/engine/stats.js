// Statistiques de l'onglet « Statistiques » : distributions binaires Oui / (Non+vide)
// et filtrage multi-dimensions (département / fédération / AGC), calculés côté client
// à partir des lignes déjà chargées par useDataStore.

// Sentinelles « sans code » pour les filtres fédération / AGC. Préfixe improbable pour
// éviter toute collision avec un vrai code (même esprit que EMPTY_FILTER dans columns.js).
export const NO_FEDERATION = '__NO_FEDERATION__'
export const NO_AGC = '__NO_AGC__'

const collator = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })

/** Répartition binaire d'une colonne de statut : `Oui` vs tout le reste (Non + vide). */
export function binaryDistribution(rows, key) {
  let oui = 0
  for (const row of rows) {
    if (row[key] === 'Oui') oui++
  }
  return { oui, reste: rows.length - oui, total: rows.length }
}

/** Valeurs uniques pour peupler les sélecteurs de filtre, triées de façon stable. */
export function statsFilterOptions(rows) {
  const departements = new Set()
  const federations = new Map() // code -> nom
  const agcs = new Map()        // code -> nom

  for (const row of rows) {
    if (row.departement) departements.add(row.departement)
    if (row.federation) federations.set(row.federation, row.nom_federation || '')
    if (row.agc) agcs.set(row.agc, row.nom_agc || '')
  }

  const codeList = (map) =>
    [...map.entries()]
      .map(([code, nom]) => ({ code, nom }))
      .sort((a, b) => collator.compare(a.code, b.code))

  return {
    departements: [...departements].sort(collator.compare),
    federations: codeList(federations),
    agcs: codeList(agcs),
  }
}

// Une ligne passe une dimension si : aucune sélection (filtre inactif), ou sa valeur est
// dans la sélection (OU intra-dimension), la sentinelle correspondant à une valeur vide.
function passesCode(value, selection, sentinel) {
  if (selection.length === 0) return true
  if (value) return selection.includes(value)
  return selection.includes(sentinel)
}

/** Filtre ET entre les 3 dimensions, OU à l'intérieur de chacune. */
export function applyStatsFilters(rows, { departements = [], federations = [], agcs = [] } = {}) {
  return rows.filter(row =>
    (departements.length === 0 || departements.includes(row.departement)) &&
    passesCode(row.federation, federations, NO_FEDERATION) &&
    passesCode(row.agc, agcs, NO_AGC)
  )
}
