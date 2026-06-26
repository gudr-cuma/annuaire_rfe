import { json, methodNotAllowed } from '../../_lib/responses.js'
import { revokeSession } from '../../_lib/db.js'
import { clearSessionCookie } from '../../_lib/session.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return methodNotAllowed()

  if (context.data.sessionId) {
    await revokeSession(env.DB, context.data.sessionId)
  }

  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() })
}
