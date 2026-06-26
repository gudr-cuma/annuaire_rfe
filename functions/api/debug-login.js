// TEMPORAIRE — supprimer après reset mdp admin
import { getUserByEmail, updateUser } from '../_lib/db.js'
import { hashPassword } from '../_lib/password.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return new Response('nope', { status: 405 })
  const { email, password, secret } = await request.json()
  if (secret !== 'reset-admin-2026') return new Response('unauthorized', { status: 401 })
  const user = await getUserByEmail(env.DB, email)
  if (!user) return Response.json({ error: 'user_not_found' })
  const hash = await hashPassword(password, env)
  await updateUser(env.DB, user.id, { password_hash: hash, failed_login_attempts: 0, locked_until: null })
  return Response.json({ ok: true, hashLen: hash.length })
}
