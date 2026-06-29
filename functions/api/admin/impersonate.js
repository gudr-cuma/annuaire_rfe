import { json, error, methodNotAllowed } from '../../_lib/responses.js'
import { buildImpCookie, clearImpCookie } from '../../_lib/session.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'POST') {
    let body
    try { body = await request.json() } catch { return error('Corps JSON invalide.', 400) }

    const userId = body?.user_id
    if (!userId) return error('user_id requis.', 400)

    const target = await env.DB.prepare(
      'SELECT id, name, role, is_active FROM users WHERE id = ?'
    ).bind(userId).first()

    if (!target) return error('Utilisateur introuvable.', 404)
    if (!target.is_active) return error('Cet utilisateur est inactif.', 400)
    if (target.role === 'admin') return error("Impossible d'impersonner un administrateur.", 400)

    return json(
      { ok: true, user: { id: target.id, name: target.name } },
      { headers: { 'Set-Cookie': buildImpCookie(userId) } },
    )
  }

  if (request.method === 'DELETE') {
    return json(
      { ok: true },
      { headers: { 'Set-Cookie': clearImpCookie() } },
    )
  }

  return methodNotAllowed()
}
