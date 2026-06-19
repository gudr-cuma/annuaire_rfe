export function ImportMetaBanner({ meta }) {
  if (!meta || !meta.imported_at) {
    return (
      <div style={{ fontSize: '12.5px', color: '#92400E', background: '#FFF3E0', border: '1px solid #FBBF24', borderRadius: '8px', padding: '8px 12px' }}>
        Aucun import n'a encore été effectué.
      </div>
    )
  }

  const date = new Date(meta.imported_at).toLocaleString('fr-FR')

  return (
    <div style={{ fontSize: '12.5px', color: '#718096', display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
      <span>Dernier import : <strong style={{ color: '#1A202C' }}>{date}</strong></span>
      <span>Dossiers : <strong style={{ color: '#1A202C' }}>{meta.dossiers_count}</strong></span>
      <span>Facturation : <strong style={{ color: '#1A202C' }}>{meta.facturation_count}</strong></span>
    </div>
  )
}

export default ImportMetaBanner
