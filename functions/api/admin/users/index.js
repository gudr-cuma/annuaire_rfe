import { json, error, methodNotAllowed } from '../../../_lib/responses.js'
import { getAllUsers, createUser } from '../../../_lib/db.js'
import { hashPassword } from '../../../_lib/password.js'

export async function onRequest(context) {
  const { request, env } = context

  if (request.method === 'GET') {
    const users = await getAllUsers(env.DB)
    return json({ users })
  }

  if (request.method === 'POST') {
    let body
    try { body = await request.json() } catch { return error('Corps JSON invalide.', 400) }

    const { email, name, password, role = 'user', is_active = 1 } = body
    if (!email || !name || !password) return error('email, name et password requis.', 400)
    if (!['admin', 'user'].includes(role)) return error('Rôle invalide.', 400)

    const password_hash = await hashPassword(password, env)
    try {
      const id = await createUser(env.DB, {
        email: email.toLowerCase().trim(),
        name,
        role,
        is_active: is_active ? 1 : 0,
        password_hash,
      })
      return json({ id }, 201)
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return error('Email déjà utilisé.', 409)
      throw err
    }
  }

  return methodNotAllowed()
}
