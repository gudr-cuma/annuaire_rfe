import { useEffect, useRef, useState } from 'react'
import { COLUMNS, BOOL_COLUMNS } from '../../engine/columns.js'
import useDataStore from '../../store/useDataStore.js'
import useImportAuthStore from '../../store/useImportAuthStore.js'
import useAuthStore from '../../store/useAuthStore.js'
import StatusTag from './StatusTag.jsx'

const MAIN_COLS = COLUMNS.filter(c => !c.statusColumn)
const STATUS_COLS = COLUMNS.filter(c => c.statusColumn)

const ACTIONS_BEFORE_KEY = 'departement'

function widthStyle(c) {
  return c.width ? { width: c.width, maxWidth: c.width, overflow: 'hidden', textOverflow: 'ellipsis' } : {}
}

const cellBase = {
  padding: '7px 12px',
  borderBottom: '1px solid #F0F0F0',
  color: '#1A202C',
  whiteSpace: 'nowrap',
}

function HeaderCell({ c, sortKey, sortDir, setSort }) {
  return (
    <th
      onClick={() => setSort(c.key)}
      style={{
        textAlign: 'left', padding: '8px 12px', background: '#F8FAFB', color: '#718096',
        textTransform: 'uppercase', fontWeight: 700, fontSize: '12px',
        borderBottom: '2px solid #E2E8F0', cursor: 'pointer', whiteSpace: 'nowrap',
        userSelect: 'none', ...widthStyle(c),
      }}
    >
      {c.label}
      {sortKey === c.key && (
        <span style={{ marginLeft: '4px', color: '#FF8200' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  )
}

function DataCell({ c, row }) {
  return (
    <td title={c.width ? (row[c.key] || '') : undefined} style={{ ...cellBase, ...widthStyle(c) }}>
      {BOOL_COLUMNS[c.key] ? <StatusTag value={row[c.key]} /> : (row[c.key] || '')}
    </td>
  )
}

function CheckboxCell({ dossierCode, field, value, canEdit }) {
  const updateRowStatus = useDataStore(s => s.updateRowStatus)

  async function handleChange(e) {
    const checked = e.target.checked
    updateRowStatus(dossierCode, { [field]: checked ? 1 : 0 })
    await fetch(`/api/status/${encodeURIComponent(dossierCode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ [field]: checked }),
    })
  }

  if (!canEdit) {
    return (
      <td style={{ ...cellBase, textAlign: 'center', color: '#CBD5E0' }}>🔒</td>
    )
  }
  return (
    <td style={{ ...cellBase, textAlign: 'center' }}>
      <input
        type="checkbox"
        checked={!!value}
        onChange={handleChange}
        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#FF8200' }}
      />
    </td>
  )
}

function CommentCell({ dossierCode, value, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value || '')
  const updateRowStatus = useDataStore(s => s.updateRowStatus)
  const inputRef = useRef(null)

  useEffect(() => { setText(value || '') }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  async function save() {
    setEditing(false)
    updateRowStatus(dossierCode, { commentaire: text })
    await fetch(`/api/status/${encodeURIComponent(dossierCode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ commentaire: text }),
    })
  }

  if (!canEdit) {
    return <td style={{ ...cellBase, color: '#CBD5E0', minWidth: '120px' }}>—</td>
  }

  if (editing) {
    return (
      <td style={{ padding: '4px 8px', borderBottom: '1px solid #F0F0F0', minWidth: '140px' }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={save}
          onKeyDown={e => {
            if (e.key === 'Enter') save()
            if (e.key === 'Escape') { setText(value || ''); setEditing(false) }
          }}
          style={{
            width: '100%', border: '1px solid #FF8200', borderRadius: '4px',
            padding: '4px 8px', fontSize: '13px', outline: 'none',
          }}
        />
      </td>
    )
  }

  return (
    <td
      onClick={() => setEditing(true)}
      style={{ ...cellBase, cursor: 'text', minWidth: '140px', whiteSpace: 'normal' }}
    >
      {text || <span style={{ color: '#CBD5E0', fontStyle: 'italic', fontSize: '12px' }}>Ajouter…</span>}
    </td>
  )
}

export function ResultsTable({ rows }) {
  const sortKey = useDataStore(s => s.sortKey)
  const sortDir = useDataStore(s => s.sortDir)
  const setSort = useDataStore(s => s.setSort)
  const authenticated = useImportAuthStore(s => s.authenticated)
  const excludeDossier = useDataStore(s => s.excludeDossier)
  const user = useAuthStore(s => s.user)
  const departments = useAuthStore(s => s.departments)

  const visibleMainCols = user ? MAIN_COLS : MAIN_COLS.filter(c => !c.refColumn)
  const insertIdx = visibleMainCols.findIndex(c => c.key === ACTIONS_BEFORE_KEY)
  const colsBefore = visibleMainCols.slice(0, insertIdx)
  const colsAfter = visibleMainCols.slice(insertIdx)

  function canEditRow(row) {
    if (!user) return false
    if (user.role === 'admin') return true
    return departments.includes(row.departement)
  }

  const thBase = {
    textAlign: 'left', padding: '8px 12px', background: '#F8FAFB', color: '#718096',
    textTransform: 'uppercase', fontWeight: 700, fontSize: '12px',
    borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap',
  }

  return (
    <div className="rfe-table-scroll">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {colsBefore.map(c => (
              <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            ))}
            {authenticated && <th style={thBase}>Actions</th>}
            {colsAfter.map(c => (
              <HeaderCell key={c.key} c={c} sortKey={sortKey} sortDir={sortDir} setSort={setSort} />
            ))}
            {user && STATUS_COLS.map(c => (
              <th key={c.key} style={{ ...thBase, textAlign: c.key === 'commentaire' ? 'left' : 'center' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const editable = canEditRow(r)
            return (
              <tr key={`${r.siren}-${r.dossier}-${i}`}>
                {colsBefore.map(c => <DataCell key={c.key} c={c} row={r} />)}
                {authenticated && (
                  <td style={{ padding: '7px 12px', borderBottom: '1px solid #F0F0F0', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => excludeDossier(r.dossier)}
                      style={{
                        padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0',
                        background: '#FFF5F5', color: '#E53935', fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      Exclure
                    </button>
                  </td>
                )}
                {colsAfter.map(c => <DataCell key={c.key} c={c} row={r} />)}
                {user && (
                  <>
                    <CheckboxCell
                      dossierCode={r.dossier} field="formulaire_rempli"
                      value={r.formulaire_rempli} canEdit={editable}
                    />
                    <CheckboxCell
                      dossierCode={r.dossier} field="justificatifs_envoyes"
                      value={r.justificatifs_envoyes} canEdit={editable}
                    />
                    <CommentCell
                      dossierCode={r.dossier} value={r.commentaire} canEdit={editable}
                    />
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ResultsTable
