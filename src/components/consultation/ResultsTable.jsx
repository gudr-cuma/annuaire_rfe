import { COLUMNS, BOOL_COLUMNS } from '../../engine/columns.js'
import useDataStore from '../../store/useDataStore.js'
import StatusTag from './StatusTag.jsx'

export function ResultsTable({ rows }) {
  const sortKey = useDataStore(s => s.sortKey)
  const sortDir = useDataStore(s => s.sortDir)
  const setSort = useDataStore(s => s.setSort)

  return (
    <div className="rfe-table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {COLUMNS.map(c => (
              <th
                key={c.key}
                onClick={() => setSort(c.key)}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: '#F8FAFB',
                  color: '#718096',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontSize: '12px',
                  borderBottom: '2px solid #E2E8F0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                }}
              >
                {c.label}
                {sortKey === c.key && (
                  <span style={{ marginLeft: '4px', color: '#FF8200' }}>
                    {sortDir === 'asc' ? '▲' : '▼'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.siren}-${r.dossier}-${i}`}>
              {COLUMNS.map(c => (
                <td
                  key={c.key}
                  style={{
                    padding: '7px 12px',
                    borderBottom: '1px solid #F0F0F0',
                    color: '#1A202C',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {BOOL_COLUMNS[c.key] ? <StatusTag value={r[c.key]} /> : (r[c.key] || '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ResultsTable
