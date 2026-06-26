import { useMemo, useRef, useState } from 'react'
import { COLUMNS, BOOL_COLUMNS, EMPTY_FILTER } from '../../engine/columns.js'
import useDataStore from '../../store/useDataStore.js'
import useAuthStore from '../../store/useAuthStore.js'

const inputStyle = {
  width: '100%', padding: '7px 10px', border: '1px solid #E2E8F0',
  borderRadius: '6px', fontSize: '13px', color: '#1A202C',
  outline: 'none', boxSizing: 'border-box', background: '#FFFFFF',
}

function TextFilterInput({ colKey, value, onChange, options }) {
  const [local, setLocal] = useState(value)
  const timer = useRef(null)
  const datalistId = `dl-filter-${colKey}`

  function handleChange(e) {
    const v = e.target.value
    setLocal(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(colKey, v), 150)
  }

  return (
    <>
      <input
        type="text"
        list={datalistId}
        value={local}
        onChange={handleChange}
        placeholder="Filtrer…"
        style={inputStyle}
      />
      <datalist id={datalistId}>
        {options.map(o => <option key={o} value={o} />)}
      </datalist>
    </>
  )
}

export function ColumnFilters() {
  const colFilters = useDataStore(s => s.colFilters)
  const setColFilter = useDataStore(s => s.setColFilter)
  const rawRows = useDataStore(s => s.rawRows)
  const user = useAuthStore(s => s.user)

  const autocompleteOptions = useMemo(() => {
    const map = {}
    for (const col of COLUMNS) {
      if (BOOL_COLUMNS[col.key] || col.statusColumn) continue
      const vals = new Set()
      for (const row of rawRows) {
        const v = row[col.key]
        if (v) vals.add(String(v))
      }
      map[col.key] = [...vals].sort((a, b) => a.localeCompare(b, 'fr'))
    }
    return map
  }, [rawRows])

  const visibleCols = COLUMNS.filter(c => {
    if (c.statusColumn) return !!user && (c.key === 'formulaire_rempli' || c.key === 'justificatifs_envoyes')
    return true
  })

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px',
      }}
    >
      {visibleCols.map(c => (
        <div key={c.key}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>
            {c.label}
          </label>
          {BOOL_COLUMNS[c.key] ? (
            <select
              value={colFilters[c.key] || ''}
              onChange={e => setColFilter(c.key, e.target.value)}
              style={inputStyle}
            >
              <option value="">Tous</option>
              <option value="Oui">Oui</option>
              <option value="Non">Non</option>
              {!c.statusColumn && <option value={EMPTY_FILTER}>Non renseigné</option>}
            </select>
          ) : (
            <TextFilterInput
              colKey={c.key}
              value={colFilters[c.key] || ''}
              onChange={setColFilter}
              options={autocompleteOptions[c.key] || []}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default ColumnFilters
