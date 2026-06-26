import { parseCookie, buildSessionCookie, clearSessionCookie } from '../../functions/_lib/session.js'

describe('parseCookie', () => {
  it('retourne la valeur du cookie demandé', () => {
    expect(parseCookie('rfe_session=abc123; other=xyz', 'rfe_session')).toBe('abc123')
  })

  it('retourne null si le cookie est absent', () => {
    expect(parseCookie('other=xyz', 'rfe_session')).toBeNull()
  })

  it('retourne null pour un header null', () => {
    expect(parseCookie(null, 'rfe_session')).toBeNull()
  })

  it('gère les valeurs avec signe égal', () => {
    expect(parseCookie('tok=a=b=c; other=1', 'tok')).toBe('a=b=c')
  })
})

describe('buildSessionCookie', () => {
  it('contient le sessionId, Max-Age, HttpOnly, Secure, SameSite=Strict', () => {
    const cookie = buildSessionCookie('my-session-id', 8)
    expect(cookie).toContain('rfe_session=my-session-id')
    expect(cookie).toContain('Max-Age=28800')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
  })
})

describe('clearSessionCookie', () => {
  it('pose Max-Age=0 pour vider le cookie', () => {
    const cookie = clearSessionCookie()
    expect(cookie).toContain('Max-Age=0')
    expect(cookie).toContain('rfe_session=')
  })
})
