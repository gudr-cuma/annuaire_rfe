import { useEffect, useRef, useState } from 'react'
import useAuthStore from '../../store/useAuthStore.js'
import LoginModal from '../auth/LoginModal.jsx'

export function AppHeader() {
  const user = useAuthStore(s => s.user)
  const originalAdmin = useAuthStore(s => s.originalAdmin)
  const logout = useAuthStore(s => s.logout)
  const impersonate = useAuthStore(s => s.impersonate)
  const stopImpersonation = useAuthStore(s => s.stopImpersonation)
  const [showLogin, setShowLogin] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const dropdownRef = useRef(null)

  async function handleOpenDropdown() {
    if (dropdownOpen) { setDropdownOpen(false); return }
    const res = await fetch('/api/admin/users', { credentials: 'same-origin' })
    const data = await res.json()
    setUsers(data.users.filter(u => u.role !== 'admin' && u.is_active))
    setFilter('')
    setDropdownOpen(true)
  }

  async function handleImpersonate(userId) {
    setDropdownOpen(false)
    setBusy(true)
    try { await impersonate(userId) } finally { setBusy(false) }
  }

  async function handleStop() {
    setBusy(true)
    try { await stopImpersonation() } finally { setBusy(false) }
  }

  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <>
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#31B700', letterSpacing: '-0.5px' }}>
            Annuaire RFE
          </span>
          <span style={{ fontSize: '13px', color: '#718096', marginLeft: '10px' }}>
            Fusion Dossiers / Facturation
          </span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              {/* Bannière impersonation */}
              {originalAdmin ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#FFF8E1', border: '1px solid #FFD54F',
                  borderRadius: '8px', padding: '6px 12px', fontSize: '13px', color: '#7B5800',
                }}>
                  <span>👁 Vue en tant que <strong>{user.name}</strong></span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleStop}
                    style={{
                      background: '#FFD54F', border: 'none', borderRadius: '4px',
                      padding: '2px 8px', fontSize: '12px', fontWeight: 600,
                      cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                    }}
                  >
                    ← Revenir à {originalAdmin.name}
                  </button>
                </div>
              ) : null}

              <span style={{ fontSize: '13px', color: '#718096' }}>{user.name}</span>

              {/* Bouton Voir en tant que (admin seulement, hors impersonation) */}
              {user.role === 'admin' && !originalAdmin ? (
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleOpenDropdown}
                    style={{
                      fontSize: '13px', color: '#718096', background: 'none',
                      border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px',
                      cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    👁 Voir en tant que ▾
                  </button>
                  {dropdownOpen && (
                    <div style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                      background: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '240px',
                    }}>
                      <div style={{ padding: '8px' }}>
                        <input
                          autoFocus
                          value={filter}
                          onChange={e => setFilter(e.target.value)}
                          placeholder="Filtrer…"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '6px 10px',
                            border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '13px',
                          }}
                        />
                      </div>
                      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {filtered.length === 0 && (
                          <p style={{ margin: 0, padding: '10px 12px', fontSize: '13px', color: '#718096' }}>
                            Aucun utilisateur
                          </p>
                        )}
                        {filtered.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleImpersonate(u.id)}
                            style={{
                              display: 'block', width: '100%', textAlign: 'left',
                              padding: '8px 12px', border: 'none', background: 'none',
                              fontSize: '13px', cursor: 'pointer', color: '#1A202C',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F7FAFC'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <span style={{ fontWeight: 600 }}>{u.name}</span>
                            <span style={{ color: '#718096', marginLeft: '6px', fontSize: '12px' }}>{u.email}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {user.role === 'admin' && !originalAdmin && (
                <a
                  href="/admin"
                  style={{
                    fontSize: '13px', color: '#718096', textDecoration: 'none',
                    border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px',
                  }}
                >
                  Admin
                </a>
              )}
              <button
                type="button"
                onClick={logout}
                style={{
                  fontSize: '13px', color: '#718096', background: 'none',
                  border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
                }}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              style={{
                fontSize: '13px', color: '#718096', background: 'none',
                border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer',
              }}
            >
              Se connecter
            </button>
          )}
          <a
            href="/import"
            style={{
              fontSize: '13px', color: '#718096', textDecoration: 'none',
              border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px',
            }}
          >
            Import
          </a>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  )
}

export default AppHeader
