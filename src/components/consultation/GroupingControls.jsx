import { GROUP_FIELDS } from '../../engine/columns.js'
import useDataStore from '../../store/useDataStore.js'

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

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
      {[0, 1, 2].map(idx => (
        <select
          key={idx}
          value={group[idx]}
          onChange={e => setGroupLevel(idx, e.target.value)}
          style={selectStyle}
        >
          {GROUP_FIELDS.map(g => (
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
