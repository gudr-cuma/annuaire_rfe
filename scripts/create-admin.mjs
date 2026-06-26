#!/usr/bin/env node
// Génère un fichier SQL pour créer/réinitialiser un compte admin.
// Usage : node scripts/create-admin.mjs <email> "<nom>" <motdepasse>
// Puis  : npx wrangler d1 execute annuaire-rfe-db --remote --file scripts/admin-seed.sql

import { webcrypto, randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const [,, email, name, password] = process.argv

if (!email || !name || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> "<nom complet>" <motdepasse>')
  process.exit(1)
}

const ITERATIONS = 100000
const KEY_LENGTH = 32
const enc = new TextEncoder()
const salt = randomUUID()

const keyMaterial = await webcrypto.subtle.importKey(
  'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
)
const bits = await webcrypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITERATIONS },
  keyMaterial, KEY_LENGTH * 8
)
const hex = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
const hash = `pbkdf2:${ITERATIONS}:${salt}:${hex}`

const emailSafe = email.replace(/'/g, "''")
const nameSafe = name.replace(/'/g, "''")

const sql = `-- Généré par create-admin.mjs — ne pas commiter
INSERT INTO users (email, name, role, is_active, password_hash)
VALUES ('${emailSafe}', '${nameSafe}', 'admin', 1, '${hash}')
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  failed_login_attempts = 0,
  locked_until = NULL,
  is_active = 1;
`

const outPath = join(dirname(fileURLToPath(import.meta.url)), 'admin-seed.sql')
writeFileSync(outPath, sql, 'utf8')

console.log(`\n✅ Fichier écrit : scripts/admin-seed.sql`)
console.log(`   email    : ${email}`)
console.log(`   hash len : ${hash.length} (attendu : 115)`)
console.log(`\nExécute maintenant :`)
console.log(`  npx wrangler d1 execute annuaire-rfe-db --remote --file scripts/admin-seed.sql`)
