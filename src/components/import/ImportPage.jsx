import useImportAuthStore from '../../store/useImportAuthStore.js'
import ImportPasswordForm from './ImportPasswordForm.jsx'
import ImportUploadForm from './ImportUploadForm.jsx'

export function ImportPage() {
  const authenticated = useImportAuthStore(s => s.authenticated)
  const statusChecked = useImportAuthStore(s => s.statusChecked)

  if (!statusChecked) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#718096' }}>Vérification de la session…</div>
  }

  return authenticated ? <ImportUploadForm /> : <ImportPasswordForm />
}

export default ImportPage
