import { getSessionId, getImpUserId } from '../_lib/session.js'
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

        // Impersonation : l'admin voit l'app comme un autre utilisateur
        if (user.role === 'admin' && !url.pathname.startsWith('/api/admin/')) {
          const impUserId = getImpUserId(request)
          if (impUserId) {
            const impUser = await getUserById(env.DB, parseInt(impUserId))
            if (impUser && impUser.is_active && impUser.role !== 'admin') {
              const impDepts = await getUserDepartments(env.DB, impUser.id)
              context.data.realAdmin = user
              context.data.user = impUser
              context.data.userDepartments = impDepts
            }
          }
        }
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
