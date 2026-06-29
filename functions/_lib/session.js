const SESSION_COOKIE = 'rfe_session'
const IMP_COOKIE = 'rfe_imp'

export function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k.trim() === name) return v.join('=').trim()
  }
  return null
}

export function getSessionId(request) {
  return parseCookie(request.headers.get('Cookie') || '', SESSION_COOKIE)
}

export function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

export function buildSessionCookie(sessionId, durationHours) {
  const maxAge = Math.round(durationHours * 3600)
  return [
    `${SESSION_COOKIE}=${sessionId}`,
    `Max-Age=${maxAge}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')
}

export function getImpUserId(request) {
  return parseCookie(request.headers.get('Cookie') || '', IMP_COOKIE)
}

export function buildImpCookie(userId) {
  return [
    `${IMP_COOKIE}=${userId}`,
    'Max-Age=86400',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')
}

export function clearImpCookie() {
  return [
    `${IMP_COOKIE}=`,
    'Max-Age=0',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')
}
