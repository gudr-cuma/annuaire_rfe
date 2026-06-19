import { COLUMNS, BOOL_COLUMNS } from '../../engine/columns.js'
import useDataStore from '../../store/useDataStore.js'
import useImportAuthStore from '../../store/useImportAuthStore.js'
import StatusTag from './StatusTag.jsx'

// L'action "Exclure" s'insère juste avant cette colonne plutôt qu'en fin de tableau.
const ACTIONS_BEFORE_KEY = 'departement'
const ACTIONS_INSERT_INDEX = COLUMNS.findIndex(c => c.key === ACTIONS_BEFORE_KEY)
const COLUMNS_BEFORE_ACTIONS = COLUMNS.slice(0, ACTIONS_INSERT_INDEX)
const COLUMNS_AFTER_ACTIONS = COLUMNS.slice(ACTIONS_INSERT_INDEX)

function widthStyle(c) {
  return c.width ? { width: c.width, maxWidth: c.width, overflow: 'hidden', textOverflow: 'ellipsis' } : {}
}

function HeaderCell({ c, sortKey, sortDir, setSort }) {
  return (
    <th
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
        ...widthStyle(c),
      }}
    >
      {c.label}
      {sortKey === c.key && (
        <span style={{ marginLeft: '4px', color: '#FF8200' }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  )
}

function DataCell({ c, row }) {
  return (
    <td
      title={c.width ? (row[c.key] || '') : undefined}
      style={{
        padding: '7px 12px',
        borderBottom: '1px solid #F0F0F0',
        color: '#1A202C',
        whiteSpace: 'nowrap',
        ...widthStyle(c),
      }}
    >
      {BOOL_COLUMNS[c.key] ? <StatusTag value={row[c.key]} /> : (row[c.key] || '')}
    </td>
  )
}

export function ResultsTable({ rows }) {
  const sortKey = useDataStore(s => s.sortKey)
  const sortDir = useDataStore(s => s.sortDir)
  const setSort = useDataStore(s => s.setSort)
  const authenticated = useImportAuthStore(s => s.authenticated)
  const excludeDossier = useDataStore(s => s.excludeDossier)

  return (
    <div className="rfe-table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {COLUMNS_BEFORE_ACTIONS.map(c => (
              <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            ))}
            {authenticated && (
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: '#F8FAFB',
                  color: '#718096',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontSize: '12px',
                  borderBottom: '2px solid #E2E8F0',
                  whiteSpace: 'nowrap',
                }}
              >
                Actions
              </th>
            )}
            {COLUMNS_AFTER_ACTIONS.map(c => (
              <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.siren}-${r.dossier}-${i}`}>
              {COLUMNS_BEFORE_ACTIONS.map(c => <DataCell key={c.key} c={c} row={r} />)}
              {authenticated && (
                <td style={{ padding: '7px 12px', borderBottom: '1px solid #F0F0F0', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => excludeDossier(r.dossier)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      background: '#FFF5F5',
                      color: '#E53935',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Exclure
                  </button>
                </td>
              )}
              {COLUMNS_AFTER_ACTIONS.map(c => <DataCell key={c.key} c={c} row={r} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ResultsTable
