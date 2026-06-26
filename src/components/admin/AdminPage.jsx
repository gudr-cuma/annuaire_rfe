import { useEffect, useState } from 'react'

const cardStyle = {
  background: '#FFFFFF', border: '1px solid #E2E8F0',
  borderRadius: '12px', padding: '24px',
}

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0',
  borderRadius: '6px', fontSize: '13px', color: '#1A202C',
  boxSizing: 'border-box', outline: 'none',
}

const btnStyle = {
  padding: '7px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', border: '1px solid #E2E8F0',
}

function UserForm({ user, onSave, onCancel }) {
  const [email, setEmail] = useState(user?.email || '')
  const [name, setName] = useState(user?.name || '')
  const [role, setRole] = useState(user?.role || 'user')
  const [isActive, setIsActive] = useState(user?.is_active ?? 1)
  const [password, setPassword] = useState('')
  const [departments, setDepartments] = useState(user?.departments?.join(';') || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!user && !password) { setError('Mot de passe requis pour un nouveau compte.'); return }
    setSaving(true)

    try {
      const body = { email, name, role, is_active: isActive ? 1 : 0 }
      if (password) body.password = password

      let userId = user?.id
      if (!user) {
        const res = await fetch('/api/admin/users', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', body: JSON.stringify(body),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur création.'); setSaving(false); return }
        const data = await res.json()
        userId = data.id
      } else {
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', body: JSON.stringify(body),
        })
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Erreur modification.'); setSaving(false); return }
      }

      await fetch(`/api/admin/users/${userId}/departments`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', body: JSON.stringify({ departments }),
      })

      onSave()
    } catch {
      setError('Erreur réseau.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '480px' }}>
      {error && <p style={{ color: '#E53935', margin: 0, fontSize: '13px' }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nom" required style={inputStyle} />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
      </div>
      <input
        type="password" value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder={user ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}
        style={inputStyle}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
        <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
          <option value="user">Utilisateur</option>
          <option value="admin">Administrateur</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!isActive} onChange={e => setIsActive(e.target.checked ? 1 : 0)} />
          Compte actif
        </label>
      </div>
      <input
        type="text" value={departments}
        onChange={e => setDepartments(e.target.value)}
        placeholder="Départements autorisés (ex: 35;44;22)"
        style={inputStyle}
      />
      <p style={{ fontSize: '12px', color: '#718096', margin: '-4px 0 0' }}>
        Séparer les codes de département par des points-virgules. Laisser vide = aucun département.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={saving}
          style={{ ...btnStyle, background: '#FF8200', color: '#fff', border: 'none', fontWeight: 700 }}>
          {saving ? 'Enregistrement…' : (user ? 'Modifier' : 'Créer')}
        </button>
        <button type="button" onClick={onCancel} style={btnStyle}>Annuler</button>
      </div>
    </form>
  )
}

export function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | { user object }
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users', { credentials: 'same-origin' })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function handleDelete(user) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'DELETE', credentials: 'same-origin',
    })
    if (res.ok) {
      setDeleteConfirm(null)
      await loadUsers()
    }
  }

  const thStyle = {
    padding: '8px 12px', textAlign: 'left', background: '#F8FAFB', color: '#718096',
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #E2E8F0',
  }
  const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #F0F0F0', fontSize: '13px', verticalAlign: 'middle' }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1A202C' }}>Gestion des utilisateurs</h1>
        {editing === null && (
          <button
            type="button" onClick={() => setEditing('new')}
            style={{ ...btnStyle, background: '#FF8200', color: '#fff', border: 'none', fontWeight: 700 }}
          >
            + Nouvel utilisateur
          </button>
        )}
      </div>

      {editing === 'new' && (
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>Nouvel utilisateur</h2>
          <UserForm onSave={async () => { setEditing(null); await loadUsers() }} onCancel={() => setEditing(null)} />
        </div>
      )}

      {editing && editing !== 'new' && (
        <div style={cardStyle}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>Modifier — {editing.name}</h2>
          <UserForm user={editing} onSave={async () => { setEditing(null); await loadUsers() }} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: '#718096', textAlign: 'center', padding: '16px' }}>Chargement…</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nom</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Rôle</th>
                  <th style={thStyle}>Actif</th>
                  <th style={thStyle}>Départements</th>
                  <th style={thStyle}>Dernière connexion</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={{ ...tdStyle, color: '#718096' }}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                        background: u.role === 'admin' ? '#FFF3E0' : '#F0FFF4',
                        color: u.role === 'admin' ? '#FF8200' : '#31B700',
                      }}>
                        {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: u.is_active ? '#31B700' : '#E53935', fontWeight: 700 }}>
                        {u.is_active ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#718096', fontSize: '12px' }}>
                      {u.departments?.length ? u.departments.join(', ') : <em>Aucun</em>}
                    </td>
                    <td style={{ ...tdStyle, color: '#718096', fontSize: '12px' }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <button type="button" onClick={() => setEditing(u)}
                        style={{ ...btnStyle, marginRight: '6px', fontSize: '12px' }}>
                        Modifier
                      </button>
                      {deleteConfirm === u.id ? (
                        <>
                          <button type="button" onClick={() => handleDelete(u)}
                            style={{ ...btnStyle, background: '#FFF5F5', color: '#E53935', border: '1px solid #FFCDD2', fontSize: '12px', marginRight: '4px' }}>
                            Confirmer
                          </button>
                          <button type="button" onClick={() => setDeleteConfirm(null)}
                            style={{ ...btnStyle, fontSize: '12px' }}>
                            Annuler
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirm(u.id)}
                          style={{ ...btnStyle, color: '#E53935', fontSize: '12px' }}>
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p style={{ textAlign: 'center', color: '#718096', padding: '16px' }}>Aucun utilisateur.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPage
