/**
 * Parsing CSV — portage exact de fusion_dossiers_facturation.html.
 * Garder en synchro avec functions/_lib/csv.js si modifié.
 */

export function detectDelimiter(firstLine) {
  const semi = (firstLine.match(/;/g) || []).length
  const comma = (firstLine.match(/,/g) || []).length
  return semi >= comma ? ';' : ','
}

export function parseCSV(text, delimiter) {
  text = text.replace(/^\uFEFF/, '')
  const lines = text.split(/\r\n|\n|\r/).filter(l => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  function parseLine(line) {
    const result = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++ }
          else inQuotes = false
        } else cur += ch
      } else {
        if (ch === '"') inQuotes = true
        else if (ch === delimiter) { result.push(cur); cur = '' }
        else cur += ch
      }
    }
    result.push(cur)
    return result.map(v => v.trim())
  }

  const headers = parseLine(lines[0])
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}
