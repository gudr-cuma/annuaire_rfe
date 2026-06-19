import { useEffect, useMemo } from 'react'
import useDataStore from '../../store/useDataStore.js'
import { applyFilters, sortRows } from '../../engine/filterSort.js'
import { buildGroupTree, collectGroupIds } from '../../engine/group.js'
import SearchBar from './SearchBar.jsx'
import ColumnFilters from './ColumnFilters.jsx'
import GroupingControls from './GroupingControls.jsx'
import ResultsTable from './ResultsTable.jsx'
import GroupedTree from './GroupedTree.jsx'
import ExportCsvButton from './ExportCsvButton.jsx'
import ImportMetaBanner from './ImportMetaBanner.jsx'
import ExclusionsPanel from './ExclusionsPanel.jsx'
import ErrorBanner from '../shared/ErrorBanner.jsx'

const cardStyle = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '12px',
  padding: '16px',
}

export function ConsultationPage() {
  const rawRows = useDataStore(s => s.rawRows)
  const meta = useDataStore(s => s.meta)
  const isLoading = useDataStore(s => s.isLoading)
  const loadError = useDataStore(s => s.loadError)
  const loadData = useDataStore(s => s.loadData)
  const search = useDataStore(s => s.search)
  const colFilters = useDataStore(s => s.colFilters)
  const group = useDataStore(s => s.group)
  const sortKey = useDataStore(s => s.sortKey)
  const sortDir = useDataStore(s => s.sortDir)
  const resetFilters = useDataStore(s => s.resetFilters)
  const filtersVersion = useDataStore(s => s.filtersVersion)

  useEffect(() => { loadData() }, [loadData])

  const filteredRows = useMemo(
    () => applyFilters(rawRows, { search, colFilters }),
    [rawRows, search, colFilters]
  )

  const levels = useMemo(() => group.filter(Boolean), [group])

  const sortedFilteredRows = useMemo(
    () => sortRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir]
  )

  const tree = useMemo(
    () => buildGroupTree(filteredRows, levels, sortKey, sortDir),
    [filteredRows, levels, sortKey, sortDir]
  )

  const allGroupIds = useMemo(() => collectGroupIds(tree), [tree])

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <ImportMetaBanner meta={meta} />
        <ExportCsvButton rows={sortedFilteredRows} />
      </div>

      {loadError && <ErrorBanner message={`Erreur de chargement des données : ${loadError}`} />}

      <div key={filtersVersion} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SearchBar />
        <details>
          <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#718096' }}>
            Filtres par colonne
          </summary>
          <div style={{ marginTop: '12px' }}>
            <ColumnFilters />
          </div>
        </details>
        <ExclusionsPanel />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <GroupingControls allGroupIds={allGroupIds} />
          <button
            type="button"
            onClick={resetFilters}
            style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#1A202C', fontSize: '13px', cursor: 'pointer' }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      </div>

      <div style={{ fontSize: '13px', color: '#718096' }}>
        {filteredRows.length} / {rawRows.length} dossiers
      </div>

      <div style={cardStyle}>
        {isLoading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>Chargement des données…</div>
        ) : levels.length === 0 ? (
          <ResultsTable rows={sortedFilteredRows} />
        ) : (
          <GroupedTree tree={tree} />
        )}
      </div>
    </div>
  )
}

export default ConsultationPage
