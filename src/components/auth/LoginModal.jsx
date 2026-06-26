import { useState } from 'react'
import useAuthStore from '../../store/useAuthStore.js'

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}

const modalStyle = {
  background: '#FFFFFF', borderRadius: '12px', padding: '32px',
  width: '100%', maxWidth: '360px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
}

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0',
  borderRadius: '6px', fontSize: '14px', color: '#1A202C',
  boxSizing: 'border-box', outline: 'none',
}

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 600, color: '#718096', marginBottom: '4px',
}

export function LoginModal({ onClose }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthStore(s => s.login)
  const isLoading = useAuthStore(s => s.isLoading)
  const error = useAuthStore(s => s.error)

  async function handleSubmit(e) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) onClose()
  }

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        <h2 style={{ margin: '0 0 24px', fontSize: '18px', fontWeight: 700, color: '#1A202C' }}>
          Connexion
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle} required autoFocus
            />
          </div>
          <div>
            <label style={labelStyle}>Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle} required
            />
          </div>
          {error && (
            <p style={{ color: '#E53935', fontSize: '13px', margin: 0 }}>{error}</p>
          )}
          <button
            type="submit" disabled={isLoading}
            style={{
              padding: '10px', borderRadius: '6px', border: 'none',
              background: isLoading ? '#FFA940' : '#FF8200', color: '#fff',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            }}
          >
            {isLoading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginModal
