import { fieldLabel } from '../../engine/columns.js'
import { groupNodeId } from '../../engine/group.js'
import useDataStore from '../../store/useDataStore.js'
import ResultsTable from './ResultsTable.jsx'

function GroupNode({ groupKey, value, count, node, path }) {
  const id = groupNodeId(path)
  const expandedGroups = useDataStore(s => s.expandedGroups)
  const toggleGroup = useDataStore(s => s.toggleGroup)
  const open = expandedGroups.has(id)

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
      <div
        className="rfe-group-summary"
        onClick={() => toggleGroup(id)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '9px 12px',
          background: '#F8FAFB',
          fontSize: '13px',
          fontWeight: 600,
          color: '#1A202C',
        }}
      >
        <span>
          <span className={`rfe-group-chevron${open ? ' open' : ''}`} style={{ marginRight: '8px', color: '#718096' }}>▸</span>
          {fieldLabel(groupKey)} : {value}
        </span>
        <span style={{ color: '#718096', fontWeight: 500 }}>
          {count} dossier{count > 1 ? 's' : ''}
        </span>
      </div>
      {open && (
        <div style={{ padding: '8px' }}>
          <GroupedTree tree={node} path={path} />
        </div>
      )}
    </div>
  )
}

export function GroupedTree({ tree, path = [] }) {
  if (tree.type === 'leaf') return <ResultsTable rows={tree.rows} />

  return (
    <div>
      {tree.groups.map(g => (
        <GroupNode
          key={g.value}
          groupKey={tree.key}
          value={g.value}
          count={g.count}
          node={g.children}
          path={[...path, `${tree.key}:${g.value}`]}
        />
      ))}
    </div>
  )
}

export default GroupedTree
