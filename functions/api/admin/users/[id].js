import { json, error, methodNotAllowed, notFound } from '../../../_lib/responses.js'
import { getUserById, updateUser, deleteUser } from '../../../_lib/db.js'
import { hashPassword } from '../../../_lib/password.js'

export async function onRequest(context) {
  const { request, env, params } = context
  const id = Number(params.id)
  if (!id) return error('ID invalide.', 400)

  if (request.method === 'GET') {
    const user = await getUserById(env.DB, id)
    if (!user) return notFound()
    const { password_hash, ...safe } = user
    return json({ user: safe })
  }

  if (request.method === 'PUT') {
    let body
    try { body = await request.json() } catch { return error('Corps JSON invalide.', 400) }

    const user = await getUserById(env.DB, id)
    if (!user) return notFound()

    const updates = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.email !== undefined) updates.email = body.email.toLowerCase().trim()
    if (body.role !== undefined) {
      if (!['admin', 'user'].includes(body.role)) return error('Rôle invalide.', 400)
      updates.role = body.role
    }
    if (body.is_active !== undefined) updates.is_active = body.is_active ? 1 : 0
    if (body.password) updates.password_hash = await hashPassword(body.password, env)

    await updateUser(env.DB, id, updates)
    return json({ ok: true })
  }

  if (request.method === 'DELETE') {
    if (context.data.user.id === id) return error('Impossible de supprimer son propre compte.', 400)
    const user = await getUserById(env.DB, id)
    if (!user) return notFound()
    await deleteUser(env.DB, id)
    return json({ ok: true })
  }

  return methodNotAllowed()
}
