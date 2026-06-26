// TEMPORAIRE — supprimer après debug
import { getUserByEmail } from '../_lib/db.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return new Response('nope', { status: 405 })
  const { email, password } = await request.json()
  const user = await getUserByEmail(env.DB, email)
  if (!user) return Response.json({ step: 'user_not_found' })

  const storedHash = user.password_hash
  const parts = storedHash.split(':')
  const [, iterStr, salt, expected] = parts

  const enc = new TextEncoder()
  const iterations = Number(iterStr)
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations },
    keyMaterial, 256
  )
  const actual = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('')

  return Response.json({
    parts: parts.length,
    iterations,
    salt,
    expected_20: expected?.substring(0, 20),
    actual_20: actual.substring(0, 20),
    match: actual === expected,
  })
}
