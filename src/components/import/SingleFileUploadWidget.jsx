import { useState } from 'react'
import Dropzone from './Dropzone.jsx'
import ErrorBanner from '../shared/ErrorBanner.jsx'
import ImportMetaBanner from '../consultation/ImportMetaBanner.jsx'
import useImportAuthStore from '../../store/useImportAuthStore.js'

export function SingleFileUploadWidget({ title, helpText, endpoint, datasetKey, meta, onImported }) {
  const logout = useImportAuthStore(s => s.logout)
  const [file, setFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!file) {
      setError('Un fichier est requis.')
      return
    }
    setIsSubmitting(true)
    setError('')
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', body: formData })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) logout()
        setError(data.error || `Erreur ${res.status}`)
        return
      }
      setResult(data)
      setFile(null)
      onImported?.(datasetKey, data)
    } catch {
      setError('Erreur réseau pendant l\'import, réessayez.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ margin: 0, fontSize: '14px', color: '#1A202C', fontWeight: 700 }}>{title}</h3>
      <ImportMetaBanner meta={meta} datasetKey={datasetKey} />
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Dropzone
          label={title}
          helpText={helpText}
          onFile={setFile}
          disabled={isSubmitting}
          selectedFileName={file?.name}
        />

        {error && <ErrorBanner message={error} />}

        {result && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#E8F5E0', border: '1px solid #B7E4A0', fontSize: '13px', color: '#268E00' }}>
            Import réussi : {result.row_count} ligne{result.row_count > 1 ? 's' : ''}.
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !file}
          style={{
            padding: '10px', borderRadius: '8px', border: 'none',
            background: (isSubmitting || !file) ? '#CBD5E0' : '#FF8200',
            color: '#FFFFFF', fontSize: '14px', fontWeight: 700,
            cursor: (isSubmitting || !file) ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Import en cours…' : 'Importer (remplace ce fichier uniquement)'}
        </button>
      </form>
    </div>
  )
}

export default SingleFileUploadWidget
