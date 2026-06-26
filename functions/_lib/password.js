const DEFAULT_ITERATIONS = 100000
const KEY_LENGTH = 32

async function deriveKey(password, salt, iterations) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations },
    keyMaterial, KEY_LENGTH * 8
  )
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a, b) {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a || '')
  const bBytes = enc.encode(b || '')
  const len = Math.max(aBytes.length, bBytes.length, 1)
  let diff = aBytes.length === bBytes.length ? 0 : 1
  for (let i = 0; i < len; i++) diff |= (aBytes[i] || 0) ^ (bBytes[i] || 0)
  return diff === 0
}

export async function hashPassword(password, env) {
  const iterations = Number(env?.PBKDF2_ITERATIONS || DEFAULT_ITERATIONS)
  const salt = crypto.randomUUID()
  const hash = await deriveKey(password, salt, iterations)
  return `pbkdf2:${iterations}:${salt}:${hash}`
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.startsWith('pbkdf2:')) return false
  const parts = storedHash.split(':')
  if (parts.length < 4) return false
  const [, iterStr, salt, expected] = parts
  const iterations = Number(iterStr)
  if (!iterations || !salt || !expected) return false
  const actual = await deriveKey(password, salt, iterations)
  return timingSafeEqual(actual, expected)
}

export async function dummyVerify() {
  await deriveKey('dummy', 'dummy-salt-xxxxxxxxxxx', 100)
}
