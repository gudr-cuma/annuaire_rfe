import { json, methodNotAllowed } from '../../_lib/responses.js'
import { getImportSessionCookie, verifySession } from '../../_lib/importSession.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'GET') return methodNotAllowed()

  const token = getImportSessionCookie(request)
  const authenticated = !!env.IMPORT_SECRET && await verifySession(env.IMPORT_SECRET, token)
  return json({ authenticated })
}
