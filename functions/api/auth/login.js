import { json, error, methodNotAllowed } from '../../_lib/responses.js'
import { getUserByEmail, updateUser, createSession } from '../../_lib/db.js'
import { verifyPassword, dummyVerify } from '../../_lib/password.js'
import { buildSessionCookie, getClientIp } from '../../_lib/session.js'
import { checkRateLimit, incrementRateLimit, clearRateLimit } from '../../_lib/ratelimit.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return methodNotAllowed()

  const ip = getClientIp(request)
  const maxAttempts = Number(env.MAX_LOGIN_ATTEMPTS_PER_IP || 5)
  const windowSeconds = Number(env.RATE_LIMIT_WINDOW_SECONDS || 900)

  const allowed = await checkRateLimit(env.RATE_LIMIT_KV, ip, maxAttempts, windowSeconds)
  if (!allowed) return error('Trop de tentatives. Réessayez dans 15 minutes.', 429)

  let body
  try { body = await request.json() } catch { return error('Corps JSON invalide.', 400) }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) return error('Email et mot de passe requis.', 400)

  const user = await getUserByEmail(env.DB, email)

  if (!user) {
    await dummyVerify()
    await incrementRateLimit(env.RATE_LIMIT_KV, ip, windowSeconds)
    return error('Email ou mot de passe invalide.', 401)
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return error('Compte temporairement verrouillé. Réessayez plus tard.', 403)
  }

  if (!user.is_active) {
    await dummyVerify()
    return error('Compte désactivé.', 403)
  }

  const valid = await verifyPassword(password, user.password_hash)

  if (!valid) {
    await incrementRateLimit(env.RATE_LIMIT_KV, ip, windowSeconds)
    const lockoutAttempts = Number(env.ACCOUNT_LOCKOUT_ATTEMPTS || 10)
    const newAttempts = (user.failed_login_attempts || 0) + 1
    const updates = { failed_login_attempts: newAttempts }
    if (newAttempts >= lockoutAttempts) {
      const lockoutHours = Number(env.ACCOUNT_LOCKOUT_HOURS || 1)
      updates.locked_until = new Date(Date.now() + lockoutHours * 3600 * 1000).toISOString()
    }
    await updateUser(env.DB, user.id, updates)
    return error('Email ou mot de passe invalide.', 401)
  }

  await clearRateLimit(env.RATE_LIMIT_KV, ip)
  await updateUser(env.DB, user.id, {
    failed_login_attempts: 0,
    locked_until: null,
    last_login: new Date().toISOString(),
  })

  const durationHours = Number(env.SESSION_DURATION_HOURS || 8)
  const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString()
  const sessionId = await createSession(env.DB, { userId: user.id, expiresAt, ipAddress: ip })

  return json({ ok: true }, 200, {
    'Set-Cookie': buildSessionCookie(sessionId, durationHours),
  })
}
