import { hashPassword, verifyPassword } from '../../functions/_lib/password.js'

const mockEnv = { PBKDF2_ITERATIONS: '1000' }

describe('password', () => {
  it('hashPassword retourne le bon format', async () => {
    const hash = await hashPassword('secret123', mockEnv)
    expect(hash).toMatch(/^pbkdf2:1000:[0-9a-f-]+:[0-9a-f]+$/)
  })

  it('verifyPassword retourne true pour le bon mot de passe', async () => {
    const hash = await hashPassword('monMotDePasse', mockEnv)
    expect(await verifyPassword('monMotDePasse', hash)).toBe(true)
  })

  it('verifyPassword retourne false pour un mauvais mot de passe', async () => {
    const hash = await hashPassword('monMotDePasse', mockEnv)
    expect(await verifyPassword('autreMotDePasse', hash)).toBe(false)
  })

  it('verifyPassword retourne false pour un hash null', async () => {
    expect(await verifyPassword('password', null)).toBe(false)
  })

  it('verifyPassword retourne false pour un hash mal formé', async () => {
    expect(await verifyPassword('password', 'not-a-hash')).toBe(false)
  })

  it('deux hash du même mot de passe sont différents (sel aléatoire)', async () => {
    const h1 = await hashPassword('same', mockEnv)
    const h2 = await hashPassword('same', mockEnv)
    expect(h1).not.toBe(h2)
  })
})
