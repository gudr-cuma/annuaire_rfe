import { useRef, useState } from 'react'
import { COLUMNS, BOOL_COLUMNS, EMPTY_FILTER } from '../../engine/columns.js'
import useDataStore from '../../store/useDataStore.js'

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  fontSize: '13px',
  color: '#1A202C',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#FFFFFF',
}

function TextFilterInput({ colKey, value, onChange }) {
  const [local, setLocal] = useState(value)
  const timer = useRef(null)

  function handleChange(e) {
    const v = e.target.value
    setLocal(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onChange(colKey, v), 150)
  }

  return <input type="text" value={local} onChange={handleChange} placeholder="Filtrer…" style={inputStyle} />
}

export function ColumnFilters() {
  const colFilters = useDataStore(s => s.colFilters)
  const setColFilter = useDataStore(s => s.setColFilter)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px',
      }}
    >
      {COLUMNS.map(c => (
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
              <option value={EMPTY_FILTER}>Non renseigné</option>
            </select>
          ) : (
            <TextFilterInput colKey={c.key} value={colFilters[c.key] || ''} onChange={setColFilter} />
          )}
        </div>
      ))}
    </div>
  )
}

export default ColumnFilters
