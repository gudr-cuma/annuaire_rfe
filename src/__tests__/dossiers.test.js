import { describe, it, expect } from 'vitest'
import { buildQuery } from '../../functions/api/dossiers/index.js'

describe('buildQuery', () => {
  it('sans options : pas de colonnes ref aliasées, pas de statut, pas de filtre dept', () => {
    const sql = buildQuery({})
    // d.federation apparaît dans les JOINs même sans withRef — on vérifie l'alias SELECT
    expect(sql).not.toMatch(/\bAS federation\b/)
    expect(sql).not.toMatch(/\bAS nom_federation\b/)
    expect(sql).not.toMatch(/\bAS agc\b/)
    expect(sql).not.toMatch(/\bAS nom_agc\b/)
    expect(sql).not.toMatch(/formulaire_rempli/)
    expect(sql).not.toMatch(/IN \(/)
    expect(sql).toMatch(/WHERE ex\.dossier_code IS NULL\s*ORDER BY/)
  })

  it('withRef: true — inclut les 4 colonnes référentiels aliasées dans le SELECT', () => {
    const sql = buildQuery({ withRef: true })
    expect(sql).toMatch(/\bAS federation\b/)
    expect(sql).toMatch(/\bAS nom_federation\b/)
    expect(sql).toMatch(/\bAS agc\b/)
    expect(sql).toMatch(/\bAS nom_agc\b/)
  })

  it('withStatus: true — inclut le LEFT JOIN dossier_status et les 3 colonnes statut', () => {
    const sql = buildQuery({ withStatus: true })
    expect(sql).toMatch(/LEFT JOIN dossier_status/)
    expect(sql).toMatch(/formulaire_rempli/)
    expect(sql).toMatch(/justificatifs_envoyes/)
    expect(sql).toMatch(/commentaire/)
  })

  it('departements non vide — ajoute IN (?, ?) avec le bon nombre de placeholders', () => {
    const sql = buildQuery({ departements: ['35', '44', '56'] })
    expect(sql).toMatch(/AND d\.departement IN \(\?, \?, \?\)/)
  })

  it('departements vide — pas de filtre IN', () => {
    const sql = buildQuery({ departements: [] })
    expect(sql).not.toMatch(/IN \(/)
  })

  it('toutes les options activées', () => {
    const sql = buildQuery({ withStatus: true, withRef: true, departements: ['22'] })
    expect(sql).toMatch(/\bAS nom_agc\b/)
    expect(sql).toMatch(/formulaire_rempli/)
    expect(sql).toMatch(/AND d\.departement IN \(\?\)/)
  })
})
