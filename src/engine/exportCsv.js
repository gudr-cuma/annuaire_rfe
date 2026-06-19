import { COLUMNS } from './columns.js'

function escapeCsvField(value) {
  const s = value === undefined || value === null ? '' : String(value)
  if (/[;"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

/**
 * Génère un CSV (séparateur `;`, BOM UTF-8 pour compatibilité Excel FR) à partir des lignes
 * déjà filtrées/triées affichées. Le regroupement est ignoré (export = liste plate).
 * @param {object[]} rows
 * @returns {string}
 */
export function buildExportCsv(rows) {
  const header = COLUMNS.map(c => escapeCsvField(c.label)).join(';')
  const lines = rows.map(r => COLUMNS.map(c => escapeCsvField(r[c.key])).join(';'))
  return '\uFEFF' + [header, ...lines].join('\r\n')
}

/** Déclenche le téléchargement du CSV dans le navigateur. */
export function downloadCsv(rows, filename = 'annuaire_rfe.csv') {
  const csv = buildExportCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
