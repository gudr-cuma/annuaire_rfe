import { getSessionId } from '../_lib/session.js'
import { getSession, getUserById, getUserDepartments, updateSessionLastSeen } from '../_lib/db.js'
import { unauthorized, forbidden } from '../_lib/responses.js'

export async function onRequest(context) {
  const { request, env, next } = context
  const url = new URL(request.url)

  // Ces routes gèrent leur propre auth
  if (
    url.pathname.startsWith('/api/import/') ||
    url.pathname === '/api/auth/login'
  ) {
    return next()
  }

  // Tentative d'injection de session (optionnelle sur la plupart des routes)
  const sessionId = getSessionId(request)
  if (sessionId) {
    const session = await getSession(env.DB, sessionId)
    if (session) {
      const user = await getUserById(env.DB, session.user_id)
      if (user && user.is_active) {
        const departments = await getUserDepartments(env.DB, user.id)
        context.data.user = user
        context.data.userDepartments = departments
        context.data.sessionId = sessionId
        updateSessionLastSeen(env.DB, sessionId) // non-bloquant
      }
    }
  }

  // Routes qui exigent une session
  if (url.pathname === '/api/auth/me' || url.pathname === '/api/auth/logout') {
    if (!context.data.user) return unauthorized()
  }

  // Routes admin : rôle admin requis
  if (url.pathname.startsWith('/api/admin/')) {
    if (!context.data.user) return unauthorized()
    if (context.data.user.role !== 'admin') return forbidden()
  }

  // Routes status : session requise
  if (url.pathname.startsWith('/api/status/')) {
    if (!context.data.user) return unauthorized()
  }

  return next()
}
