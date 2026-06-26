import { useEffect, useMemo, useState } from 'react'
import useDataStore from '../../store/useDataStore.js'
import { binaryDistribution, statsFilterOptions, applyStatsFilters } from '../../engine/stats.js'
import StatsFilters from './StatsFilters.jsx'
import StatusPieChart from './StatusPieChart.jsx'
import ErrorBanner from '../shared/ErrorBanner.jsx'

const STATUS_CHARTS = [
  { key: 'annuaire', title: 'Annuaire' },
  { key: 'plateforme', title: 'PA' },
  { key: 'adresse_active', title: 'Adr. active' },
]

const EMPTY_FILTERS = { departements: [], federations: [], agcs: [] }

export function StatisticsPage() {
  const rawRows = useDataStore(s => s.rawRows)
  const isLoading = useDataStore(s => s.isLoading)
  const loadError = useDataStore(s => s.loadError)
  const loadData = useDataStore(s => s.loadData)

  // Charge les données si l'utilisateur ouvre cet onglet en premier (sinon déjà chargées).
  useEffect(() => { if (rawRows.length === 0) loadData() }, [rawRows.length, loadData])

  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const options = useMemo(() => statsFilterOptions(rawRows), [rawRows])
  const filteredRows = useMemo(() => applyStatsFilters(rawRows, filters), [rawRows, filters])

  const setDimension = (dimension, vals) => setFilters(f => ({ ...f, [dimension]: vals }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {loadError && <ErrorBanner message={`Erreur de chargement des données : ${loadError}`} />}

      <StatsFilters
        options={options}
        value={filters}
        onChange={setDimension}
        onReset={() => setFilters(EMPTY_FILTERS)}
      />

      <div style={{ fontSize: '13px', color: '#718096' }}>
        {filteredRows.length} / {rawRows.length} dossiers retenus
      </div>

      {isLoading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: '#718096' }}>Chargement des données…</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {STATUS_CHARTS.map(c => (
            <div key={c.key} style={{ flex: '1 1 260px' }}>
              <StatusPieChart title={c.title} distribution={binaryDistribution(filteredRows, c.key)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StatisticsPage
