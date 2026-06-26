import { COLUMNS, EMPTY_FILTER } from './columns.js'
import { normalize } from './normalize.js'

function cellText(value) {
  if (value === 1) return 'Oui'
  if (value === 0) return 'Non'
  return normalize(value)
}

/**
 * @param {object[]} rows
 * @param {{search: string, colFilters: Record<string,string>}} state
 */
export function applyFilters(rows, state) {
  const search = normalize(state.search)
  const colKeys = Object.keys(state.colFilters).filter(k => state.colFilters[k])
  return rows.filter(r => {
    if (search) {
      const hit = COLUMNS.some(c => cellText(r[c.key]).indexOf(search) !== -1)
      if (!hit) return false
    }
    for (const k of colKeys) {
      const fv = state.colFilters[k]
      if (fv === EMPTY_FILTER) {
        if (r[k]) return false
      } else if (cellText(r[k]).indexOf(normalize(fv)) === -1) {
        return false
      }
    }
    return true
  })
}

/**
 * @param {object[]} rows
 * @param {string} sortKey
 * @param {'asc'|'desc'} sortDir
 */
export function sortRows(rows, sortKey, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1
  return rows.slice().sort((a, b) =>
    dir * String(a[sortKey] || '').localeCompare(String(b[sortKey] || ''), 'fr', { numeric: true, sensitivity: 'base' })
  )
}
