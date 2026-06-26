import { json, error, methodNotAllowed, notFound } from '../../../../_lib/responses.js'
import { getUserById, setUserDepartments } from '../../../../_lib/db.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method !== 'PUT') return methodNotAllowed()

  const id = Number(params.id)
  if (!id) return error('ID invalide.', 400)

  const user = await getUserById(env.DB, id)
  if (!user) return notFound()

  let body
  try { body = await request.json() } catch { return error('Corps JSON invalide.', 400) }

  const raw = typeof body.departments === 'string' ? body.departments : ''
  const departments = raw.split(';').map(d => d.trim()).filter(Boolean)

  await setUserDepartments(env.DB, id, departments)
  return json({ ok: true, departments })
}
