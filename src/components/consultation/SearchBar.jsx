import { useRef, useState } from 'react'
import useDataStore from '../../store/useDataStore.js'

export function SearchBar() {
  const search = useDataStore(s => s.search)
  const setSearch = useDataStore(s => s.setSearch)
  const [value, setValue] = useState(search)
  const timer = useRef(null)

  function handleChange(e) {
    const v = e.target.value
    setValue(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSearch(v), 150)
  }

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder="Recherche globale (nom, SIREN, ville, dossier…)"
      style={{
        width: '100%',
        padding: '10px 14px',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#1A202C',
        outline: 'none',
        boxSizing: 'border-box',
        background: '#FFFFFF',
      }}
    />
  )
}

export default SearchBar
