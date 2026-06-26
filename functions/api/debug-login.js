// TEMPORAIRE — supprimer après debug
import { getUserByEmail } from '../_lib/db.js'
import { verifyPassword } from '../_lib/password.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return new Response('nope', { status: 405 })
  const { email, password } = await request.json()
  const user = await getUserByEmail(env.DB, email)
  if (!user) return Response.json({ step: 'user_not_found' })
  const hashLen = user.password_hash?.length ?? 0
  const hashStart = user.password_hash?.substring(0, 14) ?? ''
  const valid = await verifyPassword(password, user.password_hash)
  return Response.json({ step: 'verify_done', hashLen, hashStart, valid, email: user.email })
}
