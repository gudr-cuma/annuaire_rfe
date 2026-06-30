// ── Users ────────────────────────────────────────────────────────────────────

export async function getUserByEmail(db, email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first()
}

export async function getUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
}

export async function getAllUsers(db) {
  const users = await db
    .prepare('SELECT id, email, name, role, is_active, last_login, created_at FROM users ORDER BY name COLLATE NOCASE')
    .all()
  const depts = await db
    .prepare('SELECT user_id, departement FROM user_departments ORDER BY user_id, departement')
    .all()
  const deptsByUser = {}
  for (const d of depts.results) {
    if (!deptsByUser[d.user_id]) deptsByUser[d.user_id] = []
    deptsByUser[d.user_id].push(d.departement)
  }
  return users.results.map(u => ({ ...u, departments: deptsByUser[u.id] || [] }))
}

export async function createUser(db, { email, name, role, is_active, password_hash }) {
  const result = await db
    .prepare(
      'INSERT INTO users (email, name, role, is_active, password_hash) VALUES (?, ?, ?, ?, ?) RETURNING id'
    )
    .bind(email, name, role, is_active, password_hash)
    .first()
  return result.id
}

export async function updateUser(db, id, fields) {
  const allowed = [
    'name', 'email', 'role', 'is_active', 'password_hash',
    'last_login', 'failed_login_attempts', 'locked_until',
  ]
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k))
  if (!updates.length) return
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ')
  const values = updates.map(([, v]) => v)
  await db
    .prepare(`UPDATE users SET ${setClauses}, updated_at = datetime('now') WHERE id = ?`)
    .bind(...values, id)
    .run()
}

export async function deleteUser(db, id) {
  await db.prepare('DELETE FROM users WHERE id = ?').bind(id).run()
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function getUserDepartments(db, userId) {
  const result = await db
    .prepare('SELECT departement FROM user_departments WHERE user_id = ? ORDER BY departement')
    .bind(userId)
    .all()
  return result.results.map(r => r.departement)
}

export async function setUserDepartments(db, userId, departments) {
  const stmts = [db.prepare('DELETE FROM user_departments WHERE user_id = ?').bind(userId)]
  for (const d of departments) {
    stmts.push(
      db.prepare('INSERT INTO user_departments (user_id, departement) VALUES (?, ?)').bind(userId, d)
    )
  }
  await db.batch(stmts)
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(db, { userId, expiresAt, ipAddress }) {
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO sessions (id, user_id, expires_at, ip_address) VALUES (?, ?, ?, ?)')
    .bind(id, userId, expiresAt, ipAddress)
    .run()
  return id
}

export async function getSession(db, sessionId) {
  return db
    .prepare(
      `SELECT * FROM sessions
       WHERE id = ? AND is_revoked = 0 AND expires_at > datetime('now')`
    )
    .bind(sessionId)
    .first()
}

export async function updateSessionLastSeen(db, sessionId) {
  await db
    .prepare(`UPDATE sessions SET last_seen = datetime('now') WHERE id = ?`)
    .bind(sessionId)
    .run()
}

export async function revokeSession(db, sessionId) {
  await db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').bind(sessionId).run()
}

// ── Dossier status ────────────────────────────────────────────────────────────

export async function upsertDossierStatus(db, { dossierCode, mandatSigne, formulaireRempli, justificatifsEnvoyes, commentaire, updatedBy }) {
  const insertCols = ['dossier_code', 'updated_at', 'updated_by']
  const insertVals = ['?', "datetime('now')", '?']
  const insertParams = [dossierCode, updatedBy]
  const setFields = []
  const setParams = []

  if (mandatSigne !== null) {
    insertCols.push('mandat_signe')
    insertVals.push('?')
    insertParams.push(mandatSigne)
    setFields.push('mandat_signe = ?')
    setParams.push(mandatSigne)
  }
  if (formulaireRempli !== null) {
    insertCols.push('formulaire_rempli')
    insertVals.push('?')
    insertParams.push(formulaireRempli)
    setFields.push('formulaire_rempli = ?')
    setParams.push(formulaireRempli)
  }
  if (justificatifsEnvoyes !== null) {
    insertCols.push('justificatifs_envoyes')
    insertVals.push('?')
    insertParams.push(justificatifsEnvoyes)
    setFields.push('justificatifs_envoyes = ?')
    setParams.push(justificatifsEnvoyes)
  }
  if (commentaire !== null) {
    insertCols.push('commentaire')
    insertVals.push('?')
    insertParams.push(commentaire)
    setFields.push('commentaire = ?')
    setParams.push(commentaire)
  }
  setFields.push("updated_at = datetime('now')", 'updated_by = ?')
  setParams.push(updatedBy)

  await db
    .prepare(`
      INSERT INTO dossier_status (${insertCols.join(', ')})
      VALUES (${insertVals.join(', ')})
      ON CONFLICT(dossier_code) DO UPDATE SET ${setFields.join(', ')}
    `)
    .bind(...insertParams, ...setParams)
    .run()
}
