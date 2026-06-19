import { sortRows } from './filterSort.js'

function groupByKey(rows, key) {
  const map = new Map()
  rows.forEach(r => {
    const v = r[key] || 'N/D'
    if (!map.has(v)) map.set(v, [])
    map.get(v).push(r)
  })
  return map
}

function sortedGroupKeys(map) {
  return Array.from(map.keys()).sort((a, b) => {
    if (a === 'N/D') return 1
    if (b === 'N/D') return -1
    return String(a).localeCompare(String(b), 'fr', { numeric: true })
  })
}

/**
 * Construit une arborescence de regroupement pure (pas de rendu), récursive sur `levels`
 * (jusqu'à 3 niveaux, niveaux vides ignorés en amont par l'appelant).
 *
 * @param {object[]} rows
 * @param {string[]} levels — clés de regroupement (ex: ['agc', 'federation'])
 * @param {string} sortKey
 * @param {'asc'|'desc'} sortDir
 * @returns {{type:'leaf', rows:object[]} | {type:'node', groups: {key:string, value:string, count:number, children: ReturnType<typeof buildGroupTree>}[]}}
 */
/** Identifiant stable d'un nœud de groupe, basé sur le chemin de valeurs (pas sur l'index). */
export function groupNodeId(path) {
  return path.join('>')
}

/** Collecte récursivement tous les identifiants de nœuds de l'arbre (pour tout déplier/replier). */
export function collectGroupIds(tree, path = []) {
  if (tree.type !== 'node') return []
  const ids = []
  for (const g of tree.groups) {
    const childPath = [...path, `${tree.key}:${g.value}`]
    ids.push(groupNodeId(childPath))
    ids.push(...collectGroupIds(g.children, childPath))
  }
  return ids
}

export function buildGroupTree(rows, levels, sortKey, sortDir, levelIdx = 0) {
  if (levelIdx >= levels.length || !levels[levelIdx]) {
    return { type: 'leaf', rows: sortRows(rows, sortKey, sortDir) }
  }
  const key = levels[levelIdx]
  const map = groupByKey(rows, key)
  const keys = sortedGroupKeys(map)
  return {
    type: 'node',
    key,
    groups: keys.map(value => {
      const groupRows = map.get(value)
      return {
        value,
        count: groupRows.length,
        children: buildGroupTree(groupRows, levels, sortKey, sortDir, levelIdx + 1),
      }
    }),
  }
}
