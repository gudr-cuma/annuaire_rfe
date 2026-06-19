const DATASET_LABELS = {
  dossiers: 'Dossiers',
  facturation: 'Annuaire',
  agc: 'AGC',
  federation: 'Fédération',
}

function formatLine(label, entry) {
  if (!entry || !entry.imported_at) return `${label} : aucun import`
  const date = new Date(entry.imported_at).toLocaleString('fr-FR')
  return `${label} : ${date} (${entry.row_count})`
}

/**
 * `meta` est la réponse de GET /api/meta : { dossiers, facturation, agc, federation }.
 * Avec `datasetKey`, affiche uniquement ce jeu de données (usage : widget d'import).
 * Sans `datasetKey`, affiche les 4 (usage : page de consultation).
 */
export function ImportMetaBanner({ meta, datasetKey }) {
  if (datasetKey) {
    const entry = meta && meta[datasetKey]
    return (
      <div style={{ fontSize: '12.5px', color: '#718096' }}>
        {formatLine(DATASET_LABELS[datasetKey], entry)}
      </div>
    )
  }

  if (!meta) {
    return (
      <div style={{ fontSize: '12.5px', color: '#92400E', background: '#FFF3E0', border: '1px solid #FBBF24', borderRadius: '8px', padding: '8px 12px' }}>
        Aucun import n'a encore été effectué.
      </div>
    )
  }

  return (
    <div style={{ fontSize: '12.5px', color: '#718096', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
      {Object.entries(DATASET_LABELS).map(([key, label]) => (
        <span key={key}>{formatLine(label, meta[key])}</span>
      ))}
    </div>
  )
}

export default ImportMetaBanner
