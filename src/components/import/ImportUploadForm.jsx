import { useCallback, useEffect, useState } from 'react'
import SingleFileUploadWidget from './SingleFileUploadWidget.jsx'

const WIDGETS = [
  {
    datasetKey: 'dossiers',
    title: 'Fichier Dossiers',
    helpText: 'SIREN;NOM;CPOSTAL;VIL;UN_GESDOSNO;DOSSIER;FEDERATION;AGC — séparateur ; (rarement mis à jour)',
    endpoint: '/api/import/upload-dossiers',
  },
  {
    datasetKey: 'facturation',
    title: 'Fichier Annuaire',
    helpText: 'SIREN,Annuaire,Plateforme,Adresse facturation,Adresse active — séparateur , (mis à jour souvent)',
    endpoint: '/api/import/upload-annuaire',
  },
  {
    datasetKey: 'agc',
    title: 'Fichier AGC',
    helpText: 'code;nom — séparateur ; (rarement mis à jour)',
    endpoint: '/api/import/upload-agc',
  },
  {
    datasetKey: 'federation',
    title: 'Fichier Fédération',
    helpText: 'code;nom — séparateur ; (rarement mis à jour)',
    endpoint: '/api/import/upload-federation',
  },
]

export function ImportUploadForm() {
  const [meta, setMeta] = useState(null)

  const loadMeta = useCallback(() => {
    fetch('/api/meta').then(r => r.ok ? r.json() : null).then(setMeta).catch(() => {})
  }, [])

  useEffect(() => { loadMeta() }, [loadMeta])

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {WIDGETS.map(w => (
        <SingleFileUploadWidget
          key={w.datasetKey}
          title={w.title}
          helpText={w.helpText}
          endpoint={w.endpoint}
          datasetKey={w.datasetKey}
          meta={meta}
          onImported={loadMeta}
        />
      ))}
    </div>
  )
}

export default ImportUploadForm
