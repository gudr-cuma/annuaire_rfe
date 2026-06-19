import { useState } from 'react'
import useImportAuthStore from '../../store/useImportAuthStore.js'

export function ImportPasswordForm() {
  const login = useImportAuthStore(s => s.login)
  const isLoading = useImportAuthStore(s => s.isLoading)
  const authError = useImportAuthStore(s => s.authError)
  const [secret, setSecret] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!secret) return
    login(secret)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px' }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '36px 40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#1A202C', margin: '0 0 24px' }}>
          Accès import
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A5568', marginBottom: '6px' }}>
              Secret d'import
            </label>
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
              disabled={isLoading}
              placeholder="••••••••••"
              style={{
                width: '100%', padding: '10px 12px',
                border: '1px solid #E2E8F0', borderRadius: '8px',
                fontSize: '14px', color: '#1A202C',
                outline: 'none', boxSizing: 'border-box',
                background: isLoading ? '#F8FAFB' : '#FFFFFF',
              }}
            />
          </div>

          {authError && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '13px', color: '#991B1B' }}>
              {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !secret}
            style={{
              padding: '11px', borderRadius: '8px', border: 'none',
              background: (isLoading || !secret) ? '#CBD5E0' : '#31B700',
              color: '#FFFFFF', fontSize: '15px', fontWeight: 700,
              cursor: (isLoading || !secret) ? 'not-allowed' : 'pointer',
              transition: 'background 150ms',
            }}
          >
            {isLoading ? 'Vérification…' : 'Déverrouiller'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#A0AEC0', textAlign: 'center', maxWidth: '360px' }}>
        Accès réservé — session valide 2 heures via cookie httpOnly.
      </div>
    </div>
  )
}

export default ImportPasswordForm
