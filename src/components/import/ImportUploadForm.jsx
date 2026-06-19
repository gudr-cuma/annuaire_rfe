import { useEffect, useState } from 'react'
import Dropzone from './Dropzone.jsx'
import ErrorBanner from '../shared/ErrorBanner.jsx'
import ImportMetaBanner from '../consultation/ImportMetaBanner.jsx'
import useImportAuthStore from '../../store/useImportAuthStore.js'

export function ImportUploadForm() {
  const logout = useImportAuthStore(s => s.logout)
  const [dossiersFile, setDossiersFile] = useState(null)
  const [facturationFile, setFacturationFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    fetch('/api/meta').then(r => r.ok ? r.json() : null).then(setMeta).catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!dossiersFile || !facturationFile) {
      setError('Les deux fichiers (Dossiers et Facturation) sont requis.')
      return
    }
    setIsSubmitting(true)
    setError('')
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('dossiers', dossiersFile)
      formData.append('facturation', facturationFile)
      const res = await fetch('/api/import/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) logout()
        setError(data.error || `Erreur ${res.status}`)
        return
      }
      setResult(data)
      setMeta(data)
      setDossiersFile(null)
      setFacturationFile(null)
    } catch {
      setError('Erreur réseau pendant l\'import, réessayez.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '14px', color: '#718096', fontWeight: 700, textTransform: 'uppercase' }}>
          État actuel
        </h2>
        <ImportMetaBanner meta={meta} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Dropzone
          label="Fichier Dossiers"
          helpText="SIREN;NOM;CPOSTAL;VIL;UN_GESDOSNO;DOSSIER;FEDERATION;AGC — séparateur ;"
          onFile={setDossiersFile}
          disabled={isSubmitting}
          selectedFileName={dossiersFile?.name}
        />
        <Dropzone
          label="Fichier Facturation"
          helpText="SIREN,Annuaire,Plateforme,Adresse facturation,Adresse active — séparateur ,"
          onFile={setFacturationFile}
          disabled={isSubmitting}
          selectedFileName={facturationFile?.name}
        />

        {error && <ErrorBanner message={error} />}

        {result && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#E8F5E0', border: '1px solid #B7E4A0', fontSize: '13px', color: '#268E00' }}>
            Import réussi : {result.dossiers_count} dossiers, {result.facturation_count} lignes de facturation.
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !dossiersFile || !facturationFile}
          style={{
            padding: '11px', borderRadius: '8px', border: 'none',
            background: (isSubmitting || !dossiersFile || !facturationFile) ? '#CBD5E0' : '#FF8200',
            color: '#FFFFFF', fontSize: '15px', fontWeight: 700,
            cursor: (isSubmitting || !dossiersFile || !facturationFile) ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Import en cours…' : 'Importer (remplace toutes les données existantes)'}
        </button>
      </form>
    </div>
  )
}

export default ImportUploadForm
