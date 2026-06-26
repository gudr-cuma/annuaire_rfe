import { NO_FEDERATION, NO_AGC } from '../../engine/stats.js'
import useAuthStore from '../../store/useAuthStore.js'

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
}

const listStyle = {
  marginTop: '8px',
  maxHeight: '180px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  paddingRight: '4px',
}

function toggle(arr, val) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

function CheckboxList({ label, items, selected, onChange }) {
  return (
    <details>
      <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#718096' }}>
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
      </summary>
      <div style={listStyle}>
        {items.map(item => (
          <label key={item.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1A202C', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.includes(item.value)}
              onChange={() => onChange(toggle(selected, item.value))}
              style={{ accentColor: '#FF8200' }}
            />
            {item.label}
          </label>
        ))}
      </div>
    </details>
  )
}

/** Panneau de filtres indépendant de l'onglet Statistiques (dept / fédération / AGC). */
export function StatsFilters({ options, value, onChange, onReset }) {
  const user = useAuthStore(s => s.user)
  const deptItems = options.departements.map(d => ({ value: d, label: d }))
  const fedItems = [
    ...options.federations.map(f => ({ value: f.code, label: f.nom ? `${f.code} — ${f.nom}` : f.code })),
    { value: NO_FEDERATION, label: '(Sans fédération)' },
  ]
  const agcItems = [
    ...options.agcs.map(a => ({ value: a.code, label: a.nom ? `${a.code} — ${a.nom}` : a.code })),
    { value: NO_AGC, label: '(Sans AGC)' },
  ]

  const hasFilter = value.departements.length || value.federations.length || value.agcs.length

  return (
    <div style={cardStyle}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <CheckboxList label="Département" items={deptItems} selected={value.departements} onChange={v => onChange('departements', v)} />
        {user && <CheckboxList label="Fédération" items={fedItems} selected={value.federations} onChange={v => onChange('federations', v)} />}
        {user && <CheckboxList label="AGC" items={agcItems} selected={value.agcs} onChange={v => onChange('agcs', v)} />}
      </div>
      <div>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasFilter}
          style={{
            padding: '7px 12px',
            borderRadius: '6px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            color: hasFilter ? '#1A202C' : '#A0AEC0',
            fontSize: '13px',
            cursor: hasFilter ? 'pointer' : 'default',
          }}
        >
          Réinitialiser les filtres
        </button>
      </div>
    </div>
  )
}

export default StatsFilters
