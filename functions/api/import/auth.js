import { json, error, methodNotAllowed } from '../../_lib/responses.js'
import { signSession, buildImportSessionCookie, timingSafeEqual } from '../../_lib/importSession.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return methodNotAllowed()

  if (!env.IMPORT_SECRET) {
    return error('IMPORT_SECRET non configuré côté serveur.', 500)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return error('Corps de requête JSON invalide.', 400)
  }

  const secret = typeof body.secret === 'string' ? body.secret : ''
  if (!secret || !timingSafeEqual(secret, env.IMPORT_SECRET)) {
    return error('Secret invalide.', 401)
  }

  const durationHours = Number(env.IMPORT_SESSION_DURATION_HOURS || 2)
  const expiresAtMs = Date.now() + durationHours * 3600 * 1000
  const token = await signSession(env.IMPORT_SECRET, expiresAtMs)

  return json({ ok: true }, 200, {
    'Set-Cookie': buildImportSessionCookie(token, durationHours),
  })
}
