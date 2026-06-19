import { useEffect, useState } from 'react'
import useImportAuthStore from '../../store/useImportAuthStore.js'
import useDataStore from '../../store/useDataStore.js'

export function ExclusionsPanel() {
  const authenticated = useImportAuthStore(s => s.authenticated)
  const reincludeDossier = useDataStore(s => s.reincludeDossier)
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/exclusions', { credentials: 'same-origin' })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      const data = await res.json()
      setRows(data.rows || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) Promise.resolve().then(load)
  }, [authenticated])

  if (!authenticated) return null

  async function handleReinclude(dossierCode) {
    const ok = await reincludeDossier(dossierCode)
    if (ok) setRows(prev => prev.filter(r => r.dossier_code !== dossierCode))
  }

  return (
    <details onToggle={e => { if (e.target.open) load() }}>
      <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#718096' }}>
        Voir les exclus ({rows.length})
      </summary>
      <div style={{ marginTop: '12px' }}>
        {isLoading && <div style={{ fontSize: '13px', color: '#718096' }}>Chargement…</div>}
        {error && <div style={{ fontSize: '13px', color: '#E53935' }}>{error}</div>}
        {!isLoading && rows.length === 0 && (
          <div style={{ fontSize: '13px', color: '#718096' }}>Aucune ligne exclue.</div>
        )}
        {rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                {['Dossier', 'Nom', 'SIREN', 'AGC', 'Fédération', 'Ville', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#718096', fontSize: '12px', borderBottom: '2px solid #E2E8F0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.dossier_code}>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F0F0' }}>{r.dossier_code}</td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F0F0' }}>{r.nom || '—'}</td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F0F0' }}>{r.siren || '—'}</td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F0F0' }}>{r.agc || '—'}</td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F0F0' }}>{r.federation || '—'}</td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F0F0' }}>{r.ville || '—'}</td>
                  <td style={{ padding: '6px 10px', borderBottom: '1px solid #F0F0F0' }}>
                    <button
                      type="button"
                      onClick={() => handleReinclude(r.dossier_code)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #E2E8F0',
                        background: '#E8F5E0',
                        color: '#268E00',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Réinclure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  )
}

export default ExclusionsPanel
